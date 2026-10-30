/**
 * Alertas de empleo por correo: la persona elige tipos de trabajo y provincias, confirma su correo
 * y cada día le llegan las ofertas nuevas que coinciden.
 *
 * Servicios (gratis para empezar), con sus claves solo en Vercel → Settings → Environment Variables:
 * - Upstash Redis (Vercel → Storage → Upstash for Redis): guarda las suscripciones.
 *   Variables KV_REST_API_URL y KV_REST_API_TOKEN (o UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 * - Brevo (brevo.com): envía los correos. Variables BREVO_API_KEY y ALERTAS_REMITENTE (el correo verificado en Brevo).
 * - CRON_SECRET: clave que Vercel manda al lanzar el envío diario (vercel.json), para que nadie más lo dispare.
 */
import { randomBytes } from "node:crypto";
import { site } from "@/site.config";

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const REMITENTE = process.env.ALERTAS_REMITENTE;

/** ¿Están puestas las claves? Sin ellas, la página de alertas dice "muy pronto" y la API responde 503 */
export const alertasActivas = () => Boolean(REDIS_URL && REDIS_TOKEN && BREVO_API_KEY && REMITENTE);

export type Suscripcion = {
  email: string;
  cats: string[];
  provs: string[];
  confirmada: boolean;
  creada: string;
};

/* ---------- Redis (API REST de Upstash, sin librerías) ---------- */

type Valor = string | number | null | string[];

/** Varios comandos de una vez, ej. [["SET", "k", "v"], ["GET", "k"]] */
export async function redis(...comandos: (string | number)[][]): Promise<Valor[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(comandos),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis respondió ${res.status}`);
  const datos = (await res.json()) as { result?: Valor; error?: string }[];
  const fallo = datos.find((d) => d.error);
  if (fallo) throw new Error(`Redis: ${fallo.error}`);
  return datos.map((d) => d.result ?? null);
}

export const CLAVE = {
  suscripcion: (token: string) => `alerta:${token}`,
  porCorreo: (email: string) => `alerta-correo:${email}`,
  confirmadas: "alertas:confirmadas",
  avisadas: "alertas:avisadas",
  iniciado: "alertas:iniciado",
};

export const nuevoToken = () => randomBytes(18).toString("base64url");
export const tokenValido = (t: unknown): t is string => typeof t === "string" && /^[\w-]{20,40}$/.test(t);

export async function leerSuscripcion(token: string): Promise<Suscripcion | null> {
  const [v] = await redis(["GET", CLAVE.suscripcion(token)]);
  try { return typeof v === "string" ? (JSON.parse(v) as Suscripcion) : null; } catch { return null; }
}

/* ---------- Correos (API de Brevo) ---------- */

export const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const enlaceBaja = (token: string) => `${site.url}/alertas/baja/?t=${token}`;

export async function enviarCorreo({ para, asunto, html, texto, token }: {
  para: string; asunto: string; html: string; texto: string; token?: string;
}) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_API_KEY!, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: REMITENTE, name: process.env.ALERTAS_NOMBRE || site.name },
      to: [{ email: para }],
      subject: asunto,
      htmlContent: html,
      textContent: texto,
      // Botón "Cancelar suscripción" de Gmail y Outlook (baja con un clic)
      headers: token
        ? { "List-Unsubscribe": `<${site.url}/api/alertas/baja/?t=${token}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
        : undefined,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Brevo respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Marco común de los correos: logo, contenido y pie con la baja */
export function plantillaCorreo(contenido: string, token?: string) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#eef3fb;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b3d91;padding:18px 24px;color:#ffffff;font-size:20px;font-weight:bold">Chamba <span style="color:#fdba74">en</span> Ica</td></tr>
<tr><td style="padding:24px;font-size:15px;line-height:1.6">${contenido}</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;line-height:1.5">
Nunca cobramos por postular: si alguien te pide dinero por un puesto, es estafa.<br>
${token ? `Recibes este correo porque activaste alertas en ${site.name}. <a href="${enlaceBaja(token)}" style="color:#64748b">Dejar de recibir alertas</a>.` : `Si no fuiste tú, ignora este correo: no te llegará nada más.`}
</td></tr></table></td></tr></table></body></html>`;
}
