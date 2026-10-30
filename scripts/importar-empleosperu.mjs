#!/usr/bin/env node
/**
 * Importador de ofertas de Empleos Perú (bolsa de trabajo pública del Ministerio de Trabajo, MTPE).
 *
 * Trae las ofertas vigentes del departamento de Ica (sobre todo de empresas privadas) y crea un .md
 * por oferta en content/ofertas/, con su fuente y el enlace para postular en Empleos Perú.
 * No publica los datos del reclutador (nombre, teléfono): la persona postula por el portal oficial.
 *
 * Uso:  node scripts/importar-empleosperu.mjs [--max 20] [--salida carpeta]
 */
import fs from "node:fs";
import path from "node:path";
import { inferirExperiencia } from "./inferir-campos.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const args = process.argv.slice(2);
const opcion = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SALIDA = path.resolve(RAIZ, opcion("--salida", "content/ofertas"));
const MAX = Number(opcion("--max", "0")) || Infinity;
const VISTOS = path.join(RAIZ, "data", "empleosperu-vistos.json");
const RESUMEN = path.join(RAIZ, "data", "ultimo-importe-empleosperu.md");

const API = "https://mtpe-candidatos.empleosperu.gob.pe/api/jobs";
// Con la empresa como texto de búsqueda ("what"), igual que los enlaces que genera el propio portal
const OFERTA = (id, empresa = "") =>
  `https://mtpe-candidatos.empleosperu.gob.pe/search-jobs/description?jobId=${id}${empresa ? `&what=${encodeURIComponent(empresa)}` : ""}`;
const PORTAL = "https://www.empleosperu.gob.pe";
const ICA = "11"; // código de departamento (ubigeo)
const PAUSA_MS = 700; // espera entre pedidos para no cargar el portal
const UA = "ChambaEnIca/1.0 (+https://chamba-en-ica.vercel.app; difusion de ofertas publicas de Empleos Peru)";
const SUELDO_MINIMO = 1130;
const LOGOS = path.join(RAIZ, "public", "img", "empresas");

/**
 * Logo que la empresa subió a Empleos Perú: se descarga una sola vez y se guarda en el sitio
 * (su servidor falla seguido y no conviene cargarlo desde allá en cada visita). Devuelve la ruta pública o "".
 */
async function guardarLogo(o) {
  const url = o.companyLogo?.url;
  if (!url || !o.companyId || !/^[0-9a-f]{32}$/.test(o.companyId)) return "";
  fs.mkdirSync(LOGOS, { recursive: true });
  const existente = fs.readdirSync(LOGOS).find((f) => f.startsWith(o.companyId + "."));
  if (existente) return `/img/empresas/${existente}`;
  try {
    const r = await fetch(`${API.replace(/\/jobs$/, "")}/attachments${url}`, { headers: { "User-Agent": UA } });
    const tipo = r.headers.get("content-type") ?? "";
    const ext = /png/.test(tipo) ? "png" : /webp/.test(tipo) ? "webp" : /jpe?g/.test(tipo) ? "jpg" : "";
    const datos = Buffer.from(await r.arrayBuffer());
    // Solo imágenes reales y livianas
    if (!r.ok || !ext || datos.length < 200 || datos.length > 400_000) return "";
    const archivo = `${o.companyId}.${ext}`;
    fs.writeFileSync(path.join(LOGOS, archivo), datos);
    return `/img/empresas/${archivo}`;
  } catch {
    return "";
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function pedir(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Empleos Perú respondió ${r.status} en ${url}`);
  return r.json();
}

/* ---------- Ubicación: ubigeo de la región Ica ---------- */
const PROVINCIAS = { "1101": "ica", "1102": "chincha", "1103": "nasca", "1104": "palpa", "1105": "pisco" };
const DISTRITOS = {
  "110101": "Ica", "110102": "La Tinguiña", "110103": "Los Aquijes", "110104": "Ocucaje", "110105": "Pachacútec",
  "110106": "Parcona", "110107": "Pueblo Nuevo", "110108": "Salas", "110109": "San José de los Molinos",
  "110110": "San Juan Bautista", "110111": "Santiago", "110112": "Subtanjalla", "110113": "Tate", "110114": "Yauca del Rosario",
  "110201": "Chincha Alta", "110202": "Alto Larán", "110203": "Chavín", "110204": "Chincha Baja", "110205": "El Carmen",
  "110206": "Grocio Prado", "110207": "Pueblo Nuevo", "110208": "San Juan de Yanac", "110209": "San Pedro de Huacarpana",
  "110210": "Sunampe", "110211": "Tambo de Mora",
  "110301": "Nasca", "110302": "Changuillo", "110303": "El Ingenio", "110304": "Marcona", "110305": "Vista Alegre",
  "110401": "Palpa", "110402": "Llipata", "110403": "Río Grande", "110404": "Santa Cruz", "110405": "Tibillo",
  "110501": "Pisco", "110502": "Huancano", "110503": "Humay", "110504": "Independencia", "110505": "Paracas",
  "110506": "San Andrés", "110507": "San Clemente", "110508": "Túpac Amaru Inca",
};

/* ---------- Texto ---------- */
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const SIGLAS = new Set(["SAC", "SA", "SRL", "EIRL", "SAA", "S.A.C.", "S.A.", "S.R.L.", "E.I.R.L.", "MTPE", "RRHH", "TI", "SST", "SIG", "SSOMA", "HSE", "ERP", "SAP", "BPO", "CAS", "COOPAC", "BBVA", "BCP", "IBK", "PNP", "UGEL", "II", "III", "IV", "SENASA", "ESSALUD", "SUNAT", "SUNARP", "PKS", "DM"]);
const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "para", "por", "a", "al", "con", "o", "u"]);
const limpiaPalabra = (w) => w.replace(/[^A-Za-zÁÉÍÓÚÑÜáéíóúñü.]/g, "");
const esSigla = (w) => SIGLAS.has(limpiaPalabra(w).toUpperCase()) || /\d/.test(w);
const mayuscula = (m) => m.charAt(0).toUpperCase() + m.slice(1);
const tipoNombre = (s) => (s ?? "").trim().split(/\s+/).filter(Boolean).map((w, i) => {
  if (esSigla(w)) return w.toUpperCase();
  const m = w.toLowerCase();
  // "PUBLICO-GERENCIA" → "Publico-Gerencia"
  return i > 0 && MENORES.has(m) ? m : m.split("-").map(mayuscula).join("-");
}).join(" ");
// Lugares de la región: siempre con mayúscula aunque el título venga en minúsculas
const LUGARES = new Set(["ica", "pisco", "chincha", "nasca", "nazca", "palpa", "marcona", "parcona", "paracas", "subtanjalla", "tinguiña", "salas", "santiago", "pachacutec", "pachacútec"]);
const tipoOracion = (s) => {
  const t = (s ?? "").replace(/[\s\-–|/]+$/, "").trim().split(/\s+/).filter(Boolean)
    .map((w) => {
      if (esSigla(w)) return w.toUpperCase();
      const m = w.toLowerCase();
      return LUGARES.has(m.replace(/[^a-zñáéíóú]/g, "")) ? mayuscula(m) : m;
    }).join(" ");
  return mayuscula(t);
};
// "Administrador(a) de instituto - Sede Ica" → "Administrador(a) de instituto" (el lugar ya va aparte)
const LUGAR_AL_FINAL = /\s*[-–|/]\s*(sede\s+)?[a-záéíóúñ.\s]*(ica|pisco|chincha|nasca|nazca|palpa|marcona|parcona|paracas|tinguiña|santiago|salas|subtanjalla|vista alegre|pachac[uú]tec)[a-záéíóúñ.\s]*$/i;
const tituloLimpio = (s) => {
  // Algunas empresas decoran el título con asteriscos o almohadillas
  s = (s ?? "").replace(/[*_#]+/g, " ").replace(/\s+/g, " ").trim();
  const sinLugar = s.replace(LUGAR_AL_FINAL, "").replace(/\s*[-–|/]\s*$/, "").trim();
  return sinLugar.length >= 4 ? sinLugar : (s ?? "").trim();
};
const slugDe = (s) => {
  const completo = sinTildes(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return completo.length <= 60 ? completo : completo.slice(0, 61).replace(/-[^-]*$/, "");
};
const yaml = (s) => `"${String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, " ")}"`;
const soles = (n) => `S/ ${Number(n).toLocaleString("en-US")}`;
const ddmmaaaa = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

// El texto lo escribió la empresa: se escapa el HTML (nunca se publica código ajeno) y se ordena:
// "REQUISITOS:" pasa a subtítulo en negrita y las líneas que siguen, a lista
const escapar = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const VINETA = /^(?:[•·▪●◦\-–*✔✅☑🔹🔸👉➤►✓]|\d+[.)])\s*/u;
function aTexto(s) {
  const lineas = escapar(s).replace(/\r/g, "").split("\n").map((l) => l.trim());
  const salida = [];
  let enLista = false;
  for (const l of lineas) {
    if (!l) { enLista = false; salida.push(""); continue; }
    // "REQUISITOS: ..." o una línea corta toda en mayúsculas ("🔹 LABORES")
    const sinAdorno = l.replace(VINETA, "").replace(/^[^\p{L}¡¿]+/u, "");
    const etiqueta = sinAdorno.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s/()]{2,40}):\s*(.*)$/) ?? sinAdorno.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s/()]{2,40})()$/);
    if (etiqueta) {
      // Subtítulo; si trae texto en la misma línea, va como primer punto
      salida.push("", `**${mayuscula(etiqueta[1].trim().toLowerCase())}**`, "");
      if (etiqueta[2]) salida.push(`- ${etiqueta[2]}`);
      enLista = true;
      continue;
    }
    if (VINETA.test(l) || (enLista && l.length < 220)) {
      salida.push(`- ${l.replace(VINETA, "")}`);
      enLista = true;
    } else {
      salida.push("", l, "");
      enLista = false;
    }
  }
  return salida.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---------- Campos para los filtros ---------- */
function sueldoDe(o) {
  const p = (o.offeredRemunerationPackages ?? [])[0];
  if (!p || o.displaySalary === false) return "A tratar";
  const min = Number(p.minimumAmount) || 0, max = Number(p.maximumAmount) || 0;
  if (max && max < SUELDO_MINIMO) return "A tratar"; // datos mal cargados
  if (min && max && max < 99999) return min === max ? soles(min) : `${soles(min)} a ${max.toLocaleString("en-US")}`;
  if (min) return `Desde ${soles(min)}`;
  if (max) return `Hasta ${soles(max)}`;
  return "A tratar";
}
const JORNADAS = { "1": "tiempo-completo", "2": "medio-tiempo", "3": "por-horas" };
const MODALIDADES = { "1": "remoto", "2": "presencial", "3": "hibrido" };
function educacionDe(nombre) {
  const t = sinTildes(nombre ?? "");
  if (!t) return "";
  if (/sin estudios|primaria/.test(t)) return "sin-requisito";
  if (/secundaria/.test(t)) return "secundaria";
  if (/tecnic|instituto/.test(t)) return "tecnico";
  if (/universit|bachiller|titulad|licenciad|maestr|doctor/.test(t)) return "universitario";
  return "";
}
function experienciaDe(o) {
  if (/sin exp|no requiere experiencia/i.test(`${o.positionTitle} ${o.jobDescription ?? ""}`)) return "sin-experiencia";
  const anos = Number(o.extended?.yearsOfExperience);
  if (o.extended?.yearsOfExperience != null && !Number.isNaN(anos)) {
    const meses = o.extended?.yearsOfExperienceType === "MONTHS" ? anos : anos * 12;
    if (meses === 0) return "sin-experiencia";
    if (meses < 12) return "menos-1";
    if (meses < 36) return "1-2";
    return "3-mas";
  }
  return inferirExperiencia(o.jobDescription ?? "");
}
const ESTADO = /ministerio|municipalidad|gobierno regional|poder judicial|superintendencia|programa nacional|essalud|hospital|ugel|direccion regional|seguro integral|instituto nacional|fiscal/i;
const AGRO = /agricultura|ganader|agropecuar|agroindustr|agricola|agro\b|agro |berries|fundo|vinedo|packing/i;
function categoriaDe(o) {
  const empresa = sinTildes(o.companyName ?? "");
  const sectores = (o.vacancySectors ?? o.companySectors ?? []).map((s) => sinTildes(s.name ?? "")).join(" ");
  if (ESTADO.test(empresa)) return "convocatorias-del-estado";
  if (/practicante|practicas? (pre)?profesional/i.test(sinTildes(o.positionTitle ?? ""))) return "practicas";
  if (AGRO.test(`${sectores} ${empresa}`)) return "agroexportacion";
  if (["2", "3"].includes(o.hoursPerWeek?.id) || /part time|medio tiempo|por horas/.test(sinTildes(o.positionTitle ?? ""))) return "part-time-y-temporada";
  return "empleos-en-empresas";
}
// Señales de cobro en el aviso: no se publica sin revisar
const PIDE_DINERO = /(pag(o|ar)|deposit|yape|plin|costo).{0,40}(capacitacion|inscripcion|uniforme|fotocheck|examen)/i;

function aMarkdown(o, provincia, distrito, logo = "") {
  const titulo = tipoOracion(tituloLimpio(o.positionTitle));
  const empresa = tipoNombre(o.companyName);
  const sueldo = sueldoDe(o);
  const vence = o.expiration ?? "";
  const vacantes = Number(o.openPositionCount) || 1;
  const jornada = JORNADAS[o.hoursPerWeek?.id] ?? "";
  const modalidad = MODALIDADES[o.extended?.workMode] ?? "presencial";
  const experiencia = experienciaDe(o);
  const educacion = educacionDe(o.educationDegree?.name);
  const opcionales = [jornada && `jornada: ${jornada}`, experiencia && `experiencia: ${experiencia}`, educacion && `educacion: ${educacion}`]
    .filter(Boolean).map((x) => x + "\n").join("");
  const resumen = `${empresa} busca ${titulo.toLowerCase().startsWith(empresa.toLowerCase()) ? titulo : titulo.charAt(0).toLowerCase() + titulo.slice(1)} en ${distrito}: ${vacantes} ${vacantes === 1 ? "vacante" : "vacantes"}, ${sueldo === "A tratar" ? "sueldo a tratar" : `sueldo ${sueldo.startsWith("S/") ? "de " : ""}${sueldo.replace(/^Desde/, "desde").replace(/^Hasta/, "hasta")}`}${vence ? `. Postula hasta el ${ddmmaaaa(vence)}` : ""}.`;

  const datos = [
    o.contractType?.name && `- **Contrato:** ${o.contractType.name}`,
    o.hoursPerWeek?.name && `- **Jornada:** ${o.hoursPerWeek.name}`,
    o.educationDegree?.name && `- **Estudios mínimos:** ${o.educationDegree.name}`,
    o.extended?.yearsOfExperience != null && `- **Experiencia:** ${o.extended.yearsOfExperience} ${o.extended.yearsOfExperienceType === "MONTHS" ? "mes(es)" : "año(s)"}`,
    o.extended?.requirements && `- **Formación:** ${aTexto(o.extended.requirements).replace(/\n/g, " ")}`,
    o.isDisabilityVacancy && "- **Vacante para personas con discapacidad**",
  ].filter(Boolean).join("\n");

  let cuerpo = "";
  if (o.jobDescription?.trim()) cuerpo += `## Descripción del puesto\n\n${aTexto(o.jobDescription)}\n\n`;
  if (datos) cuerpo += `## Requisitos y condiciones\n\n${datos}\n\n`;
  cuerpo += `## Cómo postular\n\n`;
  cuerpo += o.application?.type === "EXTERNAL" && o.application?.url
    ? `Postula en el [enlace de la empresa](${o.application.url}). La oferta está publicada en [Empleos Perú](${OFERTA(o.id, o.companyName)}), la bolsa de trabajo del Ministerio de Trabajo.\n`
    : `Postula gratis en [Empleos Perú](${OFERTA(o.id, o.companyName)}), la bolsa de trabajo del Ministerio de Trabajo: crea tu cuenta, completa tu perfil y pulsa **Aplicar** en la oferta.\n`;
  if (vence) cuerpo += `\n- **Postula hasta:** ${ddmmaaaa(vence)}\n`;
  // A veces el servidor de inicio de sesión de Empleos Perú falla y la página de la oferta sale en blanco
  cuerpo += `\n**Si la página de la oferta sale en blanco:** el portal puede estar con fallas. Prueba de nuevo en unos minutos o entra a [empleosperu.gob.pe](${PORTAL}), pulsa **Ver vacantes** y busca **${empresa}**.\n`;

  return `---
title: ${yaml(titulo)}
empresa: ${yaml(empresa)}
${logo ? `logo: ${yaml(logo)}\n` : ""}categoria: ${categoriaDe(o)}
provincia: ${provincia}
distrito: ${yaml(distrito)}
date: ${o.datePosted}
vence: ${vence}
sueldo: ${yaml(sueldo)}
fuente: ${yaml(OFERTA(o.id, o.companyName))}
resumen: ${yaml(resumen)}
modalidad: ${modalidad}
${opcionales}vacantes: ${vacantes}
# Importada automáticamente de Empleos Perú (MTPE). Revísala antes de aprobar.
origen: "Empleos Perú (MTPE)"
empleosperu_id: ${yaml(o.id)}
---

${cuerpo}`;
}

/* ---------- Programa principal ---------- */
async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.mkdirSync(path.dirname(VISTOS), { recursive: true });
  const vistos = new Set(fs.existsSync(VISTOS) ? JSON.parse(fs.readFileSync(VISTOS, "utf8")) : []);
  // Ofertas ya publicadas: por su id y por empresa + puesto + distrito (las empresas repiten avisos)
  const yaPublicadas = new Set();
  const publicadas = path.join(RAIZ, "content", "ofertas");
  for (const f of fs.existsSync(publicadas) ? fs.readdirSync(publicadas).filter((x) => x.endsWith(".md")) : []) {
    const t = fs.readFileSync(path.join(publicadas, f), "utf8");
    const id = t.match(/empleosperu_id:\s*"?([0-9a-f]{32})/)?.[1];
    if (id) vistos.add(id);
    const clave = ["title", "empresa", "distrito"].map((k) => sinTildes(t.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)`, "m"))?.[1] ?? "")).join("|");
    yaPublicadas.add(clave);
  }

  // 1. Todas las ofertas activas (el portal no filtra por lugar: se recorre todo y se filtra Ica)
  const lista = [];
  for (let offset = 0; ; offset += 100) {
    const pagina = await pedir(`${API}?limit=100&offset=${offset}`);
    lista.push(...(pagina.data ?? []));
    if (!pagina.data?.length || lista.length >= pagina.totalCount) break;
    await esperar(PAUSA_MS);
  }
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const deIca = lista.filter((o) => o.location?.DEPARTMENT === ICA && o.companyName && o.active !== false);
  console.log(`Empleos Perú: ${lista.length} ofertas en todo el país, ${deIca.length} en la región Ica`);

  const nuevas = [];
  const revisar = [];
  for (const resumen of deIca) {
    if (nuevas.length >= MAX) break;
    if (vistos.has(resumen.id)) continue;
    // 2. Detalle de la oferta (descripción, fecha límite, vacantes)
    await esperar(PAUSA_MS);
    const o = { ...resumen, ...(await pedir(`${API}/${resumen.id}`)) };
    vistos.add(o.id);
    if (o.expiration && o.expiration < hoy) continue; // ya cerró
    const provincia = PROVINCIAS[o.location.PROVINCE];
    if (!provincia) { revisar.push(`provincia desconocida (${o.location.PROVINCE}) en "${o.positionTitle}"`); continue; }
    const distrito = DISTRITOS[o.location.DISTRICT] ?? tipoNombre(provincia);
    const clave = [tipoOracion(tituloLimpio(o.positionTitle)), tipoNombre(o.companyName), distrito].map(sinTildes).join("|");
    if (yaPublicadas.has(clave)) continue; // mismo aviso repetido por la empresa
    yaPublicadas.add(clave);
    if (PIDE_DINERO.test(sinTildes(o.jobDescription ?? ""))) {
      revisar.push(`"${o.positionTitle}" de ${o.companyName}: el aviso menciona pagos, no se importó`);
      continue;
    }
    const nombre = `${slugDe(`${tituloLimpio(o.positionTitle)} ${o.companyName}`)}-ep${o.id.slice(0, 6)}.md`;
    const logo = await guardarLogo(o);
    fs.writeFileSync(path.join(SALIDA, nombre), aMarkdown(o, provincia, distrito, logo), "utf8");
    nuevas.push(`${tipoOracion(tituloLimpio(o.positionTitle))} — ${tipoNombre(o.companyName)} (${distrito})`);
    console.log(`    + ${nombre}`);
  }

  fs.writeFileSync(VISTOS, JSON.stringify([...vistos].sort(), null, 2) + "\n", "utf8");
  const texto = [
    nuevas.length ? `${nuevas.length} oferta(s) nueva(s) de Ica en Empleos Perú (MTPE):\n\n${nuevas.map((n) => `- ${n}`).join("\n")}` : "No hay ofertas nuevas en Empleos Perú.",
    revisar.length ? `\n**Revisa:**\n\n${revisar.map((r) => `- ${r}`).join("\n")}` : "",
  ].join("\n");
  fs.writeFileSync(RESUMEN, texto + "\n", "utf8");
  console.log(`\nListo: ${nuevas.length} nueva(s).`);
}

main().catch((e) => {
  const causa = e.cause ? ` (${e.cause.code ?? ""} ${e.cause.message ?? ""})`.replace(/\s+\)/, ")") : "";
  console.error("Error al importar de Empleos Perú:", `${e.message}${causa}`);
  process.exit(1);
});
