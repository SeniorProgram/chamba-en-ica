import { categorias, provincias, site } from "@/site.config";
import { CLAVE, alertasActivas, enviarCorreo, escapar, nuevoToken, plantillaCorreo, redis, type Suscripcion } from "@/lib/alertas";

/**
 * Nueva alerta: guarda la suscripción sin confirmar y manda un correo para confirmarla.
 * Hasta que la persona no pulsa el enlace, no recibe ninguna alerta (así nadie inscribe correos ajenos).
 */

// Límite por persona: 5 inscripciones por hora por IP (en memoria de cada servidor)
const LIMITE = 5;
const VENTANA_MS = 60 * 60 * 1000;
const usos = new Map<string, number[]>();
function permitido(ip: string) {
  const ahora = Date.now();
  const recientes = (usos.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  if (recientes.length >= LIMITE) return false;
  recientes.push(ahora);
  usos.set(ip, recientes);
  if (usos.size > 5000) usos.clear();
  return true;
}

const error = (mensaje: string, status: number) => Response.json({ error: mensaje }, { status });
const CORREO = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const elegidos = (v: unknown, validos: readonly { slug: string }[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => validos.some((o) => o.slug === x)))] : [];
const nombres = (slugs: string[], lista: readonly { slug: string; nombre: string }[], todos: string) =>
  slugs.length ? slugs.map((s) => lista.find((x) => x.slug === s)!.nombre).join(", ") : todos;

export async function POST(request: Request) {
  if (!alertasActivas()) return error("Las alertas por correo aún no están activadas.", 503);

  let cuerpo: Record<string, unknown>;
  try { cuerpo = await request.json(); } catch { return error("Solicitud no válida.", 400); }
  // Campo trampa: las personas no lo ven; los robots lo llenan
  if (cuerpo.web) return Response.json({ ok: true });
  const email = typeof cuerpo.email === "string" ? cuerpo.email.trim().toLowerCase() : "";
  if (!CORREO.test(email)) return error("Escribe un correo válido.", 400);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!permitido(ip)) return error("Hiciste muchas inscripciones seguidas. Prueba en una hora.", 429);

  const s: Suscripcion = {
    email,
    cats: elegidos(cuerpo.cats, categorias),
    provs: elegidos(cuerpo.provs, provincias),
    confirmada: false,
    creada: new Date().toISOString(),
  };
  const token = nuevoToken();

  try {
    // Sin confirmar caduca en 7 días
    await redis(["SET", CLAVE.suscripcion(token), JSON.stringify(s), "EX", 7 * 24 * 3600]);
    const enlace = `${site.url}/alertas/confirmar/?t=${token}`;
    const que = nombres(s.cats, categorias, "todos los tipos de trabajo");
    const donde = nombres(s.provs, provincias, "toda la región Ica");
    await enviarCorreo({
      para: email,
      asunto: "Confirma tus alertas de empleo",
      html: plantillaCorreo(`<p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#0b3d91">Confirma tu correo</p>
<p style="margin:0 0 16px">Pediste recibir ofertas nuevas de <strong>${escapar(que)}</strong> en <strong>${escapar(donde)}</strong>. Pulsa el botón para activarlas:</p>
<p style="margin:0 0 16px"><a href="${enlace}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:12px">Activar mis alertas</a></p>
<p style="margin:0;font-size:13px;color:#64748b">Si el botón no funciona, copia este enlace en tu navegador:<br>${enlace}</p>`),
      texto: `Pediste recibir ofertas nuevas de ${que} en ${donde}. Actívalas aquí: ${enlace}\n\nSi no fuiste tú, ignora este correo.`,
    });
  } catch (e) {
    console.error("Alertas: no se pudo inscribir", e);
    return error("No pudimos enviar el correo de confirmación. Prueba en unos minutos.", 502);
  }
  return Response.json({ ok: true });
}
