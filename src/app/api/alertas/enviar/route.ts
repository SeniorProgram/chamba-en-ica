import { categorias, provincias, site } from "@/site.config";
import {
  CLAVE, alertasActivas, enlaceBaja, enviarCorreo, escapar, plantillaCorreo, redis, type Suscripcion,
} from "@/lib/alertas";
import type { OfertaAlerta } from "../ofertas/route";

/**
 * Envío diario de alertas: lo lanza Vercel según vercel.json ("crons").
 * Toma las ofertas abiertas que aún no se avisaron, manda a cada suscriptor las que coinciden con lo que eligió
 * y las marca como avisadas. La primera vez solo marca las que ya existían (para no mandar el catálogo entero).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Brevo gratis permite 300 correos al día (sube ALERTAS_MAXIMO si pasas a un plan pagado)
const MAXIMO = Number(process.env.ALERTAS_MAXIMO) || 280;
// Ofertas por correo; si hay más, el botón lleva al buscador
const POR_CORREO = 10;

const nombreDe = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre ?? v;
const fecha = (iso: string) => (iso ? iso.split("-").reverse().join("/") : "");

function correoAlerta(s: Suscripcion, ofertas: OfertaAlerta[], token: string) {
  const lista = ofertas.slice(0, POR_CORREO);
  const filtros = new URLSearchParams();
  if (s.cats.length) filtros.set("cat", s.cats.join(","));
  if (s.provs.length) filtros.set("prov", s.provs.join(","));
  const verTodas = `${site.url}/empleos/${filtros.size ? `?${filtros}` : ""}`;
  const lugar = (o: OfertaAlerta) => `${o.distrito && o.distrito !== nombreDe(provincias, o.provincia) ? `${o.distrito}, ` : ""}${nombreDe(provincias, o.provincia)}`;
  const n = ofertas.length;

  const html = plantillaCorreo(`<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#0b3d91">${n === 1 ? "Hay 1 oferta nueva" : `Hay ${n} ofertas nuevas`} para ti</p>
${lista.map((o) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border:1px solid #e5e9f0;border-radius:12px"><tr><td style="padding:14px 16px">
<a href="${site.url}/ofertas/${o.slug}/" style="font-size:16px;font-weight:bold;color:#0b3d91;text-decoration:none">${escapar(o.title)}</a><br>
<span style="color:#475569">${escapar(o.empresa)} · ${escapar(lugar(o))}</span><br>
<span style="color:#16a34a;font-weight:bold">${escapar(o.sueldo)}</span>${o.vence ? `<span style="color:#64748b"> · Postula hasta el ${fecha(o.vence)}</span>` : ""}
</td></tr></table>`).join("\n")}
<p style="margin:20px 0 0"><a href="${verTodas}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:12px">${n > POR_CORREO ? `Ver las ${n} ofertas` : "Ver más ofertas"}</a></p>`, token);

  const texto = `${n === 1 ? "Hay 1 oferta nueva" : `Hay ${n} ofertas nuevas`} para ti en ${site.name}:\n\n`
    + lista.map((o) => `- ${o.title} – ${o.empresa} (${lugar(o)}). ${o.sueldo}. ${site.url}/ofertas/${o.slug}/`).join("\n")
    + `\n\nVer todas: ${verTodas}\nDejar de recibir alertas: ${enlaceBaja(token)}`;

  const asunto = n === 1 ? `Nueva oferta: ${lista[0].title} – ${lista[0].empresa}` : `${n} ofertas nuevas de trabajo en Ica`;
  return { html, texto, asunto };
}

export async function GET(request: Request) {
  // Solo Vercel (o quien tenga CRON_SECRET) puede lanzar el envío
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!alertasActivas()) return Response.json({ error: "Faltan las claves de las alertas." }, { status: 503 });

  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const res = await fetch(`${new URL(request.url).origin}/api/alertas/ofertas/`, { cache: "no-store" });
  if (!res.ok) return Response.json({ error: `No se pudo leer las ofertas (${res.status}).` }, { status: 502 });
  const abiertas = ((await res.json()) as OfertaAlerta[]).filter((o) => !o.vence || o.vence >= hoy);

  const [iniciado, avisadasLista, tokensLista] = await redis(
    ["GET", CLAVE.iniciado], ["SMEMBERS", CLAVE.avisadas], ["SMEMBERS", CLAVE.confirmadas],
  );
  const avisadas = new Set(Array.isArray(avisadasLista) ? avisadasLista : []);
  const nuevas = abiertas.filter((o) => !avisadas.has(o.slug));
  const marcar = async (slugs: string[]) => {
    for (let i = 0; i < slugs.length; i += 500) await redis(["SADD", CLAVE.avisadas, ...slugs.slice(i, i + 500)]);
  };

  if (!iniciado) {
    await marcar(abiertas.map((o) => o.slug));
    await redis(["SET", CLAVE.iniciado, hoy]);
    return Response.json({ ok: true, primeraVez: true, marcadas: abiertas.length });
  }
  if (!nuevas.length) return Response.json({ ok: true, nuevas: 0, enviados: 0 });

  const tokens = Array.isArray(tokensLista) ? tokensLista : [];
  let enviados = 0, fallidos = 0, sinCupo = 0;
  for (let i = 0; i < tokens.length; i += 100) {
    const grupo = tokens.slice(i, i + 100);
    const [valores] = await redis(["MGET", ...grupo.map(CLAVE.suscripcion)]);
    for (const [k, v] of (Array.isArray(valores) ? valores : []).entries()) {
      if (typeof v !== "string") continue;
      let s: Suscripcion;
      try { s = JSON.parse(v); } catch { continue; }
      if (!s.confirmada) continue;
      const suyas = nuevas.filter((o) => (!s.cats.length || s.cats.includes(o.categoria)) && (!s.provs.length || s.provs.includes(o.provincia)));
      if (!suyas.length) continue;
      if (enviados >= MAXIMO) { sinCupo++; continue; }
      try {
        const { html, texto, asunto } = correoAlerta(s, suyas, grupo[k]);
        await enviarCorreo({ para: s.email, asunto, html, texto, token: grupo[k] });
        enviados++;
      } catch (e) {
        fallidos++;
        console.error("Alertas: no se pudo enviar a un suscriptor", e);
      }
    }
  }
  await marcar(nuevas.map((o) => o.slug));
  if (sinCupo) console.warn(`Alertas: ${sinCupo} suscriptores se quedaron sin correo por el límite diario (${MAXIMO}).`);
  return Response.json({ ok: true, nuevas: nuevas.length, enviados, fallidos, sinCupo });
}
