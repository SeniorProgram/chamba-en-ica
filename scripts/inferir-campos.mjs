/**
 * Deduce experiencia, estudios y jornada a partir del texto de los requisitos de un aviso.
 * Lo usan el importador de SERVIR y scripts/completar-campos.mjs.
 * Si el texto no lo indica con claridad, devuelve "" (mejor vacío que inventado).
 */

const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Experiencia mínima: el primer plazo que aparece suele ser la experiencia GENERAL (el total exigido).
 * "dos (02) años" → 1-2 · "mínimo 06 meses" → menos-1 · "cinco (05) años" → 3-mas · "no requiere" → sin-experiencia
 */
export function inferirExperiencia(texto) {
  const t = normal(texto);
  if (!t.trim()) return "";
  if (/(no requiere|sin) experiencia|experiencia:? no (es )?(requerida|necesaria|indispensable)/.test(t)) return "sin-experiencia";
  const m = t.match(/(\d{1,2})\s*\)?\s*(anos?|meses|mes)\b/);
  if (!m) return "";
  const n = Number(m[1]);
  const meses = m[2].startsWith("an") ? n * 12 : n;
  if (meses === 0) return "sin-experiencia";
  if (meses < 12) return "menos-1";
  if (meses < 36) return "1-2";
  return "3-mas";
}

/**
 * Estudios: el nivel MÁS BAJO que acepta el aviso (si dice "bachiller o técnico", un técnico califica).
 */
export function inferirEducacion(texto) {
  const t = normal(texto);
  if (!t.trim()) return "";
  if (/no requiere|sin requisito|primaria/.test(t)) return "sin-requisito";
  if (/secundaria/.test(t)) return "secundaria";
  if (/\btecnic[oa]s?\b|instituto|tecnico superior|tecnico basico/.test(t)) return "tecnico";
  if (/bachiller|titul|licenciad|egresad[oa] universitari|universitari|colegiad|maestr|profesional/.test(t)) return "universitario";
  return "";
}

/**
 * Jornada. Los contratos del Estado (CAS D.Leg. 1057, D.Leg. 276 y 728) son de tiempo completo,
 * salvo que el aviso diga medio tiempo o por horas.
 */
export function inferirJornada(texto, esEstado = false) {
  const t = normal(texto);
  if (/medio tiempo|part[ -]?time|tiempo parcial/.test(t)) return "medio-tiempo";
  if (/por horas|\d+\s*horas (semanales|a la semana)/.test(t) && !/48 horas/.test(t)) return "por-horas";
  if (/campana|temporada/.test(t)) return "temporal";
  if (esEstado || /d\.? ?leg|1057|cas\b|tiempo completo|48 horas/.test(t)) return "tiempo-completo";
  return "";
}
