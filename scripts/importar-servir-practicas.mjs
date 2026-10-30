#!/usr/bin/env node
/**
 * Importador de prácticas del Estado: sección "Modalidades formativas" de Talento Perú (SERVIR).
 *
 * Las entidades públicas de Ica (Sunarp, Defensoría del Pueblo, municipalidades, hospitales…) publican aquí sus
 * convocatorias de prácticas preprofesionales y profesionales (D. L. 1401). Crea un .md por convocatoria en
 * content/ofertas/ con categoría "practicas".
 *
 * Uso:  node scripts/importar-servir-practicas.mjs [--max 5] [--salida carpeta]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const args = process.argv.slice(2);
const opcion = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SALIDA = path.resolve(RAIZ, opcion("--salida", "content/ofertas"));
const MAX = Number(opcion("--max", "0")) || Infinity;
const VISTOS = path.join(RAIZ, "data", "servir-practicas-vistos.json");
const RESUMEN = path.join(RAIZ, "data", "ultimo-importe-practicas.md");

const LISTA = "https://app.servir.gob.pe/DifusionOfertasExterno/faces/consultas/modalidades_formativas.xhtml";
const FORM = "frmLstModFormativas";
const ICA = "11";
const PAUSA_MS = 1500;
const UA = "ChambaEnIca/1.0 (+https://chamba-en-ica.vercel.app; importador de convocatorias publicas)";

/* ---------- Conexión con el formulario (JSF/PrimeFaces: cookies + ViewState) ---------- */
let cookies = "";
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function pedir(cuerpo, ajax = false) {
  await esperar(PAUSA_MS);
  const res = await fetch(LISTA, {
    method: cuerpo ? "POST" : "GET",
    headers: {
      "User-Agent": UA,
      Cookie: cookies,
      ...(cuerpo ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}),
      ...(ajax ? { "Faces-Request": "partial/ajax", "X-Requested-With": "XMLHttpRequest" } : {}),
    },
    body: cuerpo ? new URLSearchParams(cuerpo).toString() : undefined,
  });
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const par = c.split(";")[0];
    cookies = [...cookies.split("; ").filter((x) => x && !x.startsWith(par.split("=")[0] + "=")), par].join("; ");
  }
  if (!res.ok) throw new Error(`SERVIR respondió ${res.status}`);
  return res.text();
}
const viewState = (t) =>
  t.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/)?.[1] ??
  t.match(/<update id="[^"]*ViewState[^"]*"><!\[CDATA\[([^\]]*)\]\]>/)?.[1];

// Campos del formulario tal como los trae la página, con Ica elegido
function camposDe(html) {
  const campos = { [FORM]: FORM };
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/g)) {
    if (!m[1].startsWith(FORM)) continue;
    if (/type="radio"/.test(m[0]) && !/checked/.test(m[0])) continue;
    campos[m[1]] = m[0].match(/value="([^"]*)"/)?.[1] ?? "";
  }
  campos[`${FORM}:cboDep_input`] = ICA;
  return campos;
}
const botonBuscar = (t) =>
  t.match(new RegExp(`<button[^>]*id="(${FORM}:j_idt\\d+)"[^>]*title="Buscar"`))?.[1] ??
  t.match(new RegExp(`<button[^>]*title="Buscar"[^>]*id="(${FORM}:j_idt\\d+)"`))?.[1];

/* ---------- Lectura del texto ---------- */
const decodificar = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const lineas = (t) =>
  t.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "\n").split("\n").map((s) => decodificar(s).replace(/\s+/g, " ").trim()).filter(Boolean);

// Fila de la lista: puesto, entidad, modalidad, ubicación, convocatoria, vacantes, fechas
function leerLista(t) {
  const l = lineas(t);
  const filas = [];
  for (let i = 0; i < l.length; i++) {
    if (l[i] !== "Ubicación:") continue;
    // Antes de "Ubicación:": PUESTO, ENTIDAD, "Tipo de Modalidad:", modalidad, "Ver más", "Convocatoria en", "Word"
    const iTipo = l.lastIndexOf("Tipo de Modalidad:", i);
    const o = { puesto: l[iTipo - 2], entidad: l[iTipo - 1], modalidad: l[iTipo + 1], ubicacion: `${l[i + 1]} ${l[i + 2] ?? ""}`.replace(/\s+/g, " ").trim() };
    for (let k = i; k < Math.min(l.length, i + 16); k++) {
      if (l[k] === "Convocatoria:" && l[k - 1] === "Número de") o.convocatoria = l[k + 1];
      if (l[k].startsWith("Número de Vacante")) o.vacantes = Number(l[k + 1]) || null;
      if (l[k] === "Publicación:" && l[k - 1] === "Inicio de") o.inicio = l[k + 1];
      if (l[k] === "Publicación:" && l[k - 1] === "Cierre de") o.fin = l[k + 1];
    }
    filas.push(o);
  }
  return filas;
}

// Detalle: bloques entre títulos conocidos
const TITULOS = ["Unidad Orgánica", "Dirección", "Actividades", "Requerimientos", "Conocimientos Básicos", "Beneficios", "Resumen del Aviso", "Cronograma", "Contacto"];
function leerDetalle(t) {
  const l = lineas(t);
  const bloques = {};
  let actual = null;
  for (const x of l) {
    if (TITULOS.includes(x)) { actual = x; bloques[x] = []; continue; }
    if (/^Imprimir aviso|^Aplicativo Admistrado/.test(x)) actual = null;
    if (actual) bloques[actual].push(x);
  }
  const fecha = l[l.findIndex((x) => x === "Fecha de Publicación:") + 1];
  const correo = (bloques["Contacto"] ?? []).join(" ").match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "";
  // Cronograma: Etapa, Fec. Ini., Fec. Fin, y luego grupos de 3
  const crono = [];
  const c = (bloques["Cronograma"] ?? []).filter((x) => !/^(Etapa|Fec\. Ini\.|Fec\. Fin)$/.test(x));
  for (let i = 0; i + 2 < c.length; i += 3) if (/\d{2}\/\d{2}\/\d{4}/.test(c[i + 1])) crono.push([c[i], c[i + 1], c[i + 2]]);
  return { bloques, fecha, correo, crono };
}

/* ---------- Al formato de Chamba en Ica ---------- */
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const PROVINCIA_DE = {};
for (const [prov, distritos] of Object.entries({
  ica: ["ica", "la tinguiña", "los aquijes", "ocucaje", "pachacutec", "parcona", "pueblo nuevo", "salas", "san jose de los molinos", "san juan bautista", "santiago", "subtanjalla", "tate", "yauca del rosario"],
  chincha: ["chincha alta", "alto laran", "chavin", "chincha baja", "el carmen", "grocio prado", "san juan de yanac", "san pedro de huacarpana", "sunampe", "tambo de mora", "chincha"],
  nasca: ["nasca", "nazca", "changuillo", "el ingenio", "marcona", "vista alegre"],
  palpa: ["palpa", "llipata", "rio grande", "santa cruz", "tibillo"],
  pisco: ["pisco", "huancano", "humay", "independencia", "paracas", "san andres", "san clemente", "tupac amaru inca"],
})) for (const d of distritos) PROVINCIA_DE[sinTildes(d)] ??= prov;

const SIGLAS = new Set(["XI", "NRO", "SUNARP", "UGEL", "DIRESA", "ESSALUD", "SUNAT", "INPE", "SENASA", "PNP", "ANA", "II", "III", "IV", "MIDIS", "SIS", "UNICA"]);
const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "para", "por", "a", "al", "con"]);
const tipoNombre = (s) => (s ?? "").trim().split(/\s+/).map((w, i) => {
  if (SIGLAS.has(w.replace(/[^A-Za-zÑ]/g, "").toUpperCase())) return w.toUpperCase();
  const m = w.toLowerCase();
  return i > 0 && MENORES.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1);
}).join(" ").replace(/\bNro\b/gi, "N.°");
const tipoOracion = (s) => { const t = (s ?? "").toLowerCase().trim(); return t.charAt(0).toUpperCase() + t.slice(1); };
const fechaIso = (dmy) => { const m = (dmy ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
const yaml = (s) => `"${String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const slugDe = (s) => { const c = sinTildes(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return c.length <= 60 ? c : c.slice(0, 61).replace(/-[^-]*$/, ""); };
const escapar = (s) => String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function aMarkdown(o, d, provincia, distrito, id) {
  const titulo = tipoOracion(o.puesto);
  const entidad = tipoNombre(o.entidad);
  const b = d.bloques;
  const beneficios = (b["Beneficios"] ?? []).join(" ");
  const subvencion = beneficios.match(/S\/\s*([\d,]+(?:\.\d+)?)/)?.[1];
  const monto = subvencion ? Number(subvencion.replace(/,/g, "")) : 0;
  const sueldo = monto ? `S/ ${monto.toLocaleString("en-US")}` : "A tratar";
  const horas = Number(beneficios.match(/(\d+)\s*horas semanales/)?.[1] ?? 0);
  const jornada = horas >= 40 ? "tiempo-completo" : horas ? "medio-tiempo" : "";
  const req = (b["Requerimientos"] ?? []).join(" ");
  const educacion = /universitari/i.test(req) ? "universitario" : /t[eé]cnic/i.test(req) ? "tecnico" : "";
  const vence = fechaIso(o.fin);
  const ddmm = (iso) => iso.split("-").reverse().join("/");
  const resumen = `${entidad} convoca ${o.vacantes ?? 1} ${o.vacantes === 1 ? "vacante" : "vacantes"} de ${titulo.toLowerCase()} en ${distrito}${monto ? `, con subvención de ${sueldo}` : ""}${vence ? `. Postula hasta el ${ddmm(vence)}` : ""}.`;

  // Une las líneas que el portal corta a mitad de frase (la siguiente empieza en minúscula) y quita la numeración
  const unir = (xs) => xs.reduce((acc, x) => {
    if (acc.length && /^[a-záéíóúñ(]/.test(x) && !/^[a-z]\)/.test(x)) acc[acc.length - 1] += ` ${x}`;
    else acc.push(x);
    return acc;
  }, []).map((x) => x.replace(/^(\d+[.)]|[a-z]\))\s*/, ""));
  const lista = (xs) => unir(xs).map((x) => `- ${escapar(x)}`).join("\n");
  const titulo1 = (s) => s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, c) => a + c.toUpperCase()).replace(/\b(De|Del|La|Las|Los|Y|E|En)\b/g, (m) => m.toLowerCase());

  // "Egresado | Carrera Universitaria | DERECHO | CONTABILIDAD" → "Egresado(a) de carrera universitaria en: Derecho, Contabilidad"
  const r = b["Requerimientos"] ?? [];
  const iTipo = r.findIndex((x) => /^Carrera (Universitaria|T[eé]cnica)/i.test(x));
  let requisitos = r;
  if (iTipo >= 0) {
    const estado = r.slice(0, iTipo).join(" / ") || "Estudiante o egresado";
    const carreras = r.slice(iTipo + 1).filter((x) => x === x.toUpperCase()).map(titulo1);
    const resto = r.slice(iTipo + 1).filter((x) => x !== x.toUpperCase());
    requisitos = [`${estado.replace(/^Egresado$/i, "Egresado(a)")} de ${r[iTipo].toLowerCase()}${carreras.length ? ` en: ${carreras.join(", ")}` : ""}`, ...resto];
  }
  let cuerpo = `## Requisitos\n\n`;
  if (requisitos.length) cuerpo += `${lista(requisitos)}\n`;
  if (b["Conocimientos Básicos"]?.length) cuerpo += `\n**Conocimientos básicos**\n\n${lista(b["Conocimientos Básicos"])}\n`;
  if (b["Actividades"]?.length) cuerpo += `\n## Actividades\n\n${lista(b["Actividades"])}\n`;
  cuerpo += `\n## Condiciones\n\n`;
  cuerpo += `- **Modalidad:** ${escapar(o.modalidad ?? "Prácticas")} (D. L. N.° 1401)\n`;
  if (b["Unidad Orgánica"]?.length) cuerpo += `- **Área:** ${escapar(b["Unidad Orgánica"].join(" "))}\n`;
  if (b["Dirección"]?.length) cuerpo += `- **Lugar:** ${escapar(b["Dirección"].join(" "))}\n`;
  // Beneficios en puntos claros: subvención, duración, jornada y horario
  const meses = beneficios.match(/(\d+)\s*mes\(es\)/)?.[1];
  const entra = beneficios.match(/Ingreso de Pr[aá]cticas\s*([\d:]+\s*[AP]M)/i)?.[1];
  const sale = beneficios.match(/Salida de Pr[aá]cticas\s*([\d:]+\s*[AP]M)/i)?.[1];
  if (monto) cuerpo += `- **Subvención mensual:** ${sueldo}\n`;
  if (meses) cuerpo += `- **Duración del convenio:** ${meses} ${meses === "1" ? "mes" : "meses"}\n`;
  if (horas) cuerpo += `- **Jornada:** ${horas} horas semanales\n`;
  if (entra && sale) cuerpo += `- **Horario:** de ${entra.toLowerCase()} a ${sale.toLowerCase()}\n`;
  if (d.crono.length) {
    cuerpo += `\n## Cronograma\n\n| Etapa | Desde | Hasta |\n|---|---|---|\n`;
    cuerpo += d.crono.map(([e, a, z]) => `| ${escapar(e)} | ${a} | ${z} |`).join("\n") + "\n";
  }
  cuerpo += `\n## Cómo postular\n\n`;
  cuerpo += `Revisa las bases y la forma de postular en [Talento Perú – Prácticas](${LISTA}): elige el departamento **Ica** y busca **${entidad}**`;
  cuerpo += o.convocatoria ? `, convocatoria **N.° ${escapar(o.convocatoria)}**.\n` : ".\n";
  if (d.correo) cuerpo += `\n- **Consultas:** ${d.correo}\n`;
  if (vence) cuerpo += `- **Fin de la difusión:** ${ddmm(vence)}\n`;

  return `---
title: ${yaml(titulo)}
empresa: ${yaml(entidad)}
categoria: practicas
provincia: ${provincia}
distrito: ${yaml(distrito)}
date: ${fechaIso(d.fecha) || fechaIso(o.inicio)}
vence: ${vence}
sueldo: ${yaml(sueldo)}
fuente: ${yaml(LISTA)}
resumen: ${yaml(resumen)}
modalidad: presencial
${jornada ? `jornada: ${jornada}\n` : ""}experiencia: sin-experiencia
${educacion ? `educacion: ${educacion}\n` : ""}vacantes: ${o.vacantes ?? ""}
# Importada automáticamente de Talento Perú – Prácticas (SERVIR). Revísala antes de aprobar.
origen: "Talento Perú – Prácticas (SERVIR)"
servir_practica: ${yaml(id)}
---

${cuerpo}`;
}

/* ---------- Programa principal ---------- */
async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  const vistos = new Set(fs.existsSync(VISTOS) ? JSON.parse(fs.readFileSync(VISTOS, "utf8")) : []);
  const publicadas = path.join(RAIZ, "content", "ofertas");
  for (const f of fs.existsSync(publicadas) ? fs.readdirSync(publicadas).filter((x) => x.endsWith(".md")) : []) {
    const m = fs.readFileSync(path.join(publicadas, f), "utf8").match(/servir_practica:\s*"([0-9a-f]+)"/);
    if (m) vistos.add(m[1]);
  }

  const inicio = await pedir();
  const campos = camposDe(inicio);
  const boton = botonBuscar(inicio);
  if (!boton) throw new Error("No encontré el botón Buscar en Talento Perú – Prácticas: el portal pudo cambiar.");
  const lista = await pedir({
    ...campos, "javax.faces.ViewState": viewState(inicio), "javax.faces.partial.ajax": "true", "javax.faces.source": boton,
    "javax.faces.partial.execute": "@all", "javax.faces.partial.render": `${FORM}:mensaje ${FORM}`, [boton]: boton,
  }, true);
  const vs = viewState(lista) ?? viewState(inicio);
  const filas = leerLista(lista);
  // Botón "Ver más" de cada fila (el de número más bajo; el otro descarga el Word)
  const botones = filas.map((_, i) => {
    const ids = [...lista.matchAll(new RegExp(`${FORM}:idPnlRepeatPuestos:${i}:j_idt(\\d+)`, "g"))].map((m) => Number(m[1]));
    return ids.length ? `${FORM}:idPnlRepeatPuestos:${i}:j_idt${Math.min(...ids)}` : null;
  });
  console.log(`Talento Perú – Prácticas: ${filas.length} convocatoria(s) en Ica`);

  const nuevas = [], revisar = [];
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  for (let i = 0; i < filas.length && nuevas.length < MAX; i++) {
    const o = filas[i];
    if (!/^ICA\b/i.test(o.ubicacion)) continue;
    const id = crypto.createHash("sha1").update(`${o.entidad}|${o.convocatoria}|${o.ubicacion}|${o.puesto}`).digest("hex").slice(0, 16);
    if (vistos.has(id)) continue;
    if (fechaIso(o.fin) && fechaIso(o.fin) < hoy) { vistos.add(id); continue; }
    if (!botones[i]) { revisar.push(`no pude abrir el detalle de "${o.puesto}" de ${o.entidad}`); continue; }
    const d = leerDetalle(await pedir({ ...campos, "javax.faces.ViewState": vs, [botones[i]]: "" }));
    const lugar = o.ubicacion.split(" - ").slice(1).join(" - ").trim() || "Ica";
    const provincia = PROVINCIA_DE[sinTildes(lugar)] ?? "ica";
    if (!PROVINCIA_DE[sinTildes(lugar)]) revisar.push(`no reconocí el distrito "${lugar}" de ${o.entidad}: revisa la provincia`);
    const distrito = tipoNombre(lugar);
    const nombre = `${slugDe(`${o.puesto} ${o.entidad} ${lugar}`)}-sp${id.slice(0, 6)}.md`;
    fs.writeFileSync(path.join(SALIDA, nombre), aMarkdown(o, d, provincia, distrito, id), "utf8");
    vistos.add(id);
    nuevas.push(`${tipoOracion(o.puesto)} — ${tipoNombre(o.entidad)} (${distrito})`);
    console.log(`    + ${nombre}`);
  }

  fs.mkdirSync(path.dirname(VISTOS), { recursive: true });
  fs.writeFileSync(VISTOS, JSON.stringify([...vistos].sort(), null, 2) + "\n", "utf8");
  const texto = [
    nuevas.length ? `${nuevas.length} práctica(s) nueva(s) del Estado en Ica:\n\n${nuevas.map((n) => `- ${n}`).join("\n")}` : "No hay prácticas nuevas en Talento Perú.",
    revisar.length ? `\n**Revisa:**\n\n${revisar.map((r) => `- ${r}`).join("\n")}` : "",
  ].join("\n");
  fs.writeFileSync(RESUMEN, texto + "\n", "utf8");
  console.log(`\nListo: ${nuevas.length} nueva(s).`);
}

main().catch((e) => {
  const causa = e.cause ? ` (${e.cause.code ?? ""} ${e.cause.message ?? ""})`.replace(/\s+\)/, ")") : "";
  console.error("Error al importar prácticas de Talento Perú:", `${e.message}${causa}`);
  process.exit(1);
});
