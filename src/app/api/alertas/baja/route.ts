import { CLAVE, alertasActivas, leerSuscripcion, redis, tokenValido } from "@/lib/alertas";

/**
 * Baja de las alertas. La llama la página /alertas/baja/ (con { t } en el cuerpo) y también el botón
 * "Cancelar suscripción" de Gmail y Outlook, que envía un POST a /api/alertas/baja/?t=... (baja con un clic).
 */
export async function POST(request: Request) {
  if (!alertasActivas()) return Response.json({ error: "Las alertas aún no están activadas." }, { status: 503 });
  let t: unknown = new URL(request.url).searchParams.get("t");
  if (!t) {
    try { t = (await request.json())?.t; } catch { /* sin cuerpo */ }
  }
  if (!tokenValido(t)) return Response.json({ error: "El enlace no es válido." }, { status: 400 });

  try {
    const s = await leerSuscripcion(t);
    const comandos: (string | number)[][] = [["DEL", CLAVE.suscripcion(t)], ["SREM", CLAVE.confirmadas, t]];
    if (s) {
      const [actual] = await redis(["GET", CLAVE.porCorreo(s.email)]);
      if (actual === t) comandos.push(["DEL", CLAVE.porCorreo(s.email)]);
    }
    await redis(...comandos);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Alertas: no se pudo dar de baja", e);
    return Response.json({ error: "No pudimos darte de baja. Prueba en unos minutos." }, { status: 502 });
  }
}
