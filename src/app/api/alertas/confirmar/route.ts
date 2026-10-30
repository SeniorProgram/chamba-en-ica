import { CLAVE, alertasActivas, leerSuscripcion, redis, tokenValido } from "@/lib/alertas";

/** Activa la alerta cuando la persona pulsa el enlace del correo (la página /alertas/confirmar/ llama aquí) */
export async function POST(request: Request) {
  if (!alertasActivas()) return Response.json({ error: "Las alertas aún no están activadas." }, { status: 503 });
  let t: unknown;
  try { t = (await request.json())?.t; } catch { /* sin cuerpo */ }
  if (!tokenValido(t)) return Response.json({ error: "El enlace no es válido." }, { status: 400 });

  try {
    const s = await leerSuscripcion(t);
    if (!s) return Response.json({ error: "El enlace venció o ya no existe. Vuelve a crear tu alerta." }, { status: 404 });
    if (!s.confirmada) {
      // Si ese correo ya tenía otra alerta, la nueva la reemplaza (con sus nuevas preferencias)
      const [anterior] = await redis(["GET", CLAVE.porCorreo(s.email)]);
      const comandos: (string | number)[][] = [
        ["SET", CLAVE.suscripcion(t), JSON.stringify({ ...s, confirmada: true })],
        ["SET", CLAVE.porCorreo(s.email), t],
        ["SADD", CLAVE.confirmadas, t],
      ];
      if (typeof anterior === "string" && anterior !== t) {
        comandos.push(["DEL", CLAVE.suscripcion(anterior)], ["SREM", CLAVE.confirmadas, anterior]);
      }
      await redis(...comandos);
    }
    return Response.json({ ok: true, cats: s.cats, provs: s.provs });
  } catch (e) {
    console.error("Alertas: no se pudo confirmar", e);
    return Response.json({ error: "No pudimos activar tu alerta. Prueba en unos minutos." }, { status: 502 });
  }
}
