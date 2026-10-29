#!/usr/bin/env node
/**
 * Importa las convocatorias del Estado en la región Ica publicadas en Talento Perú (SERVIR)
 * y las guarda como ofertas en content/ofertas/ para que las revises antes de publicarlas.
 *
 * Uso:  node scripts/importar-servir.mjs [--salida carpeta] [--max N]
 *   --salida  dónde escribir las ofertas (por defecto content/ofertas)
 *   --max     cuántas ofertas nuevas como máximo (por defecto todas)
 *
 * No necesita dependencias: usa fetch de Node 20+.
 * Lo corre GitHub Actions cada mañana (.github/workflows/importar-servir.yml) y abre un Pull Request.
 */
import fs from "node:fs";
import path from "node:path";
import { inferirEducacion, inferirExperiencia, inferirJornada } from "./inferir-campos.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const args = process.argv.slice(2);
const opcion = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SALIDA = path.resolve(RAIZ, opcion("--salida", "content/ofertas"));
const MAX = Number(opcion("--max", "0")) || Infinity;
const VISTOS = path.join(RAIZ, "data", "servir-vistos.json");

const BASE = "https://app.servir.gob.pe/DifusionOfertasExterno/faces/consultas/";
const LISTA = BASE + "ofertas_laborales.xhtml";
const PORTAL = "https://app.servir.gob.pe/DifusionOfertasExterno/faces/consultas/ofertas_laborales.xhtml";
const ICA = "11"; // código del departamento en el formulario de SERVIR
const PAUSA_MS = 1500; // espera entre pedidos para no cargar el servidor de SERVIR
const UA = "ChambaEnIca/1.0 (+https://chamba-en-ica.vercel.app; importador de convocatorias publicas)";

/* ---------- Conexión con el formulario (JSF/PrimeFaces: cookies + ViewState) ---------- */

let cookies = "";
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url, cuerpo, ajax = false) {
  await esperar(PAUSA_MS);
  const res = await fetch(url, {
    method: cuerpo ? "POST" : "GET",
    redirect: "follow",
    headers: {
      "User-Agent": UA,
      Cookie: cookies,
      ...(cuerpo ? { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" } : {}),
      ...(ajax ? { "Faces-Request": "partial/ajax", "X-Requested-With": "XMLHttpRequest" } : {}),
    },
    body: cuerpo ? new URLSearchParams(cuerpo).toString() : undefined,
  });
  const nuevas = res.headers.getSetCookie?.() ?? [];
  for (const c of nuevas) {
    const par = c.split(";")[0];
    const nombre = par.split("=")[0];
    cookies = [...cookies.split("; ").filter((x) => x && !x.startsWith(nombre + "=")), par].join("; ");
  }
  if (!res.ok) throw new Error(`SERVIR respondió ${res.status} en ${url}`);
  return res.text();
}

const viewState = (t) =>
  t.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]*)"/)?.[1] ??
  t.match(/<update id="[^"]*ViewState[^"]*"><!\[CDATA\[([^\]]*)\]\]>/)?.[1];

// Campos que manda el formulario de búsqueda, con el departamento de Ica elegido
const formulario = (vs, extra) => ({
  frmLstOfertsLabo: "frmLstOfertsLabo",
  "frmLstOfertsLabo:modalidadAcceso": "03",
  "frmLstOfertsLabo:txtPerfil": "",
  "frmLstOfertsLabo:cboDep_focus": "",
  "frmLstOfertsLabo:cboDep_input": ICA,
  "frmLstOfertsLabo:txtPuesto": "",
  "frmLstOfertsLabo:autocompletar_input": "",
  "frmLstOfertsLabo:autocompletar_hinput": "",
  "frmLstOfertsLabo:txtNroConv": "",
  "javax.faces.ViewState": vs,
  ...extra,
});

// Pulsa un botón del formulario por AJAX (Buscar, Siguiente página)
const ajax = (vs, boton) =>
  pedir(LISTA, formulario(vs, {
    "javax.faces.partial.ajax": "true",
    "javax.faces.source": boton,
    "javax.faces.partial.execute": "@all",
    "javax.faces.partial.render": "frmLstOfertsLabo:mensaje frmLstOfertsLabo",
    [boton]: boton,
  }), true);

// Id del botón según su título ("Buscar", "Sig.") — los ids j_idtNN pueden cambiar entre versiones del portal
function botonPorTitulo(t, titulo) {
  const re = new RegExp(`<button[^>]*id="(frmLstOfertsLabo:j_idt\\d+)"[^>]*title="${titulo}"`);
  const re2 = new RegExp(`<button[^>]*title="${titulo}"[^>]*id="(frmLstOfertsLabo:j_idt\\d+)"`);
  return t.match(re)?.[1] ?? t.match(re2)?.[1];
}
function botonSiguiente(t) {
  // El botón "Sig." no tiene título: es el que contiene el texto "Sig." y no está deshabilitado
  const m = [...t.matchAll(/<button id="(frmLstOfertsLabo:j_idt\d+)"[^>]*?(disabled="disabled")?[^>]*>[\s\S]{0,300}?<\/button>/g)]
    .find((x) => /Sig\./.test(x[0]));
  return m && !m[2] ? m[1] : null;
}

/* ---------- Lectura del texto ---------- */

const decodificar = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const lineas = (t) =>
  t.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "\n").split("\n").map((s) => decodificar(s).replace(/\s+/g, " ").trim()).filter(Boolean);

// Cada oferta de la lista: puesto, entidad, ubicación, convocatoria, vacantes, sueldo y fechas
function leerLista(t) {
  const l = lineas(t);
  const ofertas = [];
  for (let i = 0; i < l.length; i++) {
    if (l[i] !== "Ubicación:") continue;
    const o = { puesto: l[i - 2], entidad: l[i - 1], ubicacion: `${l[i + 1]} ${l[i + 2] ?? ""}`.replace(/\s+-\s+/, " - ").trim() };
    for (let k = i; k < Math.min(l.length, i + 25); k++) {
      if (l[k].startsWith("Número de Convocatoria")) o.convocatoria = l[k + 1];
      if (l[k].startsWith("Cantidad de Vacantes")) o.vacantes = Number(l[k + 1]) || null;
      if (l[k].startsWith("Remuneración")) o.sueldo = l[k + 1];
      if (l[k] === "Publicación:" && l[k - 1] === "Fecha Inicio de") o.inicio = l[k + 1];
      if (l[k].startsWith("Fecha Fin de Publicación")) o.fin = l[k + 1];
    }
    ofertas.push(o);
  }
  return ofertas;
}

// Detalle: requisitos por sección, enlace de la entidad y número de aviso
function leerDetalle(t) {
  const l = lineas(t);
  const inicio = l.findIndex((x) => x === "Sobre el Aviso");
  const fin = l.findIndex((x, i) => i > inicio && x.startsWith("CANTIDAD DE VACANTES"));
  const secciones = {};
  let actual = null;
  for (const x of l.slice(inicio + 1, fin > 0 ? fin : undefined)) {
    const titulo = x.match(/^([A-ZÁÉÍÓÚÑ ]+(?:- PERFIL)?):$/);
    if (titulo || /^(FORMACIÓN|ACADÉMICA - PERFIL:)$/.test(x)) {
      actual = x.replace(/:$/, "").replace("ACADÉMICA - PERFIL", "FORMACIÓN ACADÉMICA");
      if (actual === "FORMACIÓN") continue;
      secciones[actual] = [];
      continue;
    }
    if (actual) secciones[actual].push(x);
  }
  const detalle = (secciones["DETALLE"] ?? []).join(" ");
  const enlace = detalle.match(/https?:\/\/[^\s,;)]+/)?.[0];
  const aviso = l[l.findIndex((x) => x === "N°") + 1];
  const iAviso = l.findIndex((x) => x === "Aviso");
  delete secciones["DETALLE"];
  delete secciones["REQUERIMIENTO"];
  return { secciones, enlace, aviso: /^\d+$/.test(aviso ?? "") ? aviso : null, titulo: iAviso >= 0 ? l[iAviso + 1] : "" };
}

/* ---------- De SERVIR al formato de Chamba en Ica ---------- */

// Distritos de cada provincia de la región Ica
const DISTRITOS = {
  ica: ["ica", "la tinguina", "los aquijes", "ocucaje", "pachacutec", "parcona", "salas", "guadalupe", "san jose de los molinos", "san juan bautista", "santiago", "subtanjalla", "tate", "yauca del rosario"],
  chincha: ["chincha", "chincha alta", "alto laran", "chavin", "chincha baja", "el carmen", "grocio prado", "san juan de yanac", "san pedro de huacarpana", "sunampe", "tambo de mora"],
  pisco: ["pisco", "huancano", "humay", "independencia", "paracas", "san andres", "san clemente", "tupac amaru inca", "tupac amaru"],
  nasca: ["nasca", "nazca", "changuillo", "el ingenio", "marcona", "vista alegre"],
  palpa: ["palpa", "llipata", "rio grande", "santa cruz", "tibillo"],
};
const sinTildes = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function provinciaDe(lugar) {
  const d = sinTildes(lugar);
  for (const [prov, lista] of Object.entries(DISTRITOS)) if (lista.includes(d)) return { provincia: prov, segura: true };
  return { provincia: "ica", segura: false }; // "Pueblo Nuevo" existe en Ica y Chincha: se revisa a mano
}

const SIGLAS = new Set(["I", "INPE", "UNATECH", "UGEL", "CAS", "CEBE", "DIRESA", "INABIF", "SUNAT", "RENIEC", "ESSALUD", "MINSA", "PNP", "FAP", "TI", "RRHH", "SIAF", "SIGA", "OCI", "PRONABEC", "SIS", "II", "III", "IV", "VI", "VII", "VIII", "IX", "EIRL", "SAC", "SA", "MIDIS", "MINEDU", "MTPE", "ANA", "SENASA", "INEI", "ONP", "SUTRAN", "SUNARP", "OSCE", "PCM", "MEF", "MINAGRI", "MIDAGRI", "MIMP", "MINJUSDH", "DRE", "GORE", "IREN", "SEDAPAL", "EPS", "UNICA", "CEM", "DEMUNA", "OMAPED", "CIAM"]);
const MENORES = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "en", "para", "por", "a", "al", "con", "o", "u"]);
const palabra = (w, i) => {
  const limpia = w.replace(/[^A-Za-zÁÉÍÓÚÑÜ]/g, "");
  if (SIGLAS.has(limpia.toUpperCase()) || /\d/.test(w)) return w.toUpperCase();
  const m = w.toLowerCase();
  if (i > 0 && MENORES.has(m)) return m;
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const tipoNombre = (s) => (s ?? "").replace(/[\s-]+$/, "").split(/\s+/).filter(Boolean).map(palabra).join(" ");
// ¿Parece un nombre de puesto de verdad? (algunas entidades publican "1" o vacío)
const puestoValido = (s) => (s ?? "").replace(/[^A-Za-zÁÉÍÓÚÑ]/g, "").length >= 4;
const SUELDO_MINIMO = 1130;
// Puesto en forma de oración: "Personal especializado en el servicio CEBE"
const tipoOracion = (s) => {
  const t = (s ?? "").split(/\s+/).filter(Boolean).map((w) => {
    const limpia = w.replace(/[^A-Za-zÁÉÍÓÚÑÜ]/g, "");
    return SIGLAS.has(limpia.toUpperCase()) || /\d/.test(w) ? w.toUpperCase() : w.toLowerCase();
  }).join(" ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const fechaIso = (dmy) => { const m = (dmy ?? "").match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
// "S/. 3,064.19" → "S/ 3,064.19" (se toma el primer número; sin número = "A tratar")
const dinero = (s) => {
  const m = String(s ?? "").match(/\d[\d,]*(?:\.\d+)?/);
  const n = m ? Number(m[0].replace(/,/g, "")) : 0;
  return n ? `S/ ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}` : "A tratar";
};
// Nombre de archivo corto y sin cortar palabras a la mitad
const slugDe = (s) => {
  const completo = sinTildes(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (completo.length <= 60) return completo;
  return completo.slice(0, 61).replace(/-[^-]*$/, "");
};
const yaml = (s) => `"${String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const viñeta = (x) => x.replace(/^[¿•·\-–*]\s*/, "").replace(/\s*[¿•]\s*/g, "\n- ").trim();

function aMarkdown(o, d, provincia, lugar) {
  // Experiencia, estudios y jornada vienen escritos en los requisitos: se deducen del texto
  const textoDe = (clave) => (d.secciones[clave] ?? []).join(" ");
  const experiencia = inferirExperiencia(textoDe("EXPERIENCIA"));
  const educacion = inferirEducacion(textoDe("FORMACIÓN ACADÉMICA"));
  const jornada = inferirJornada(`${o.convocatoria ?? ""} ${Object.values(d.secciones).flat().join(" ")}`, true);
  const opcionales = [jornada && `jornada: ${jornada}`, experiencia && `experiencia: ${experiencia}`, educacion && `educacion: ${educacion}`]
    .filter(Boolean).map((x) => x + "\n").join("");
  const fuente = d.enlace ?? PORTAL;
  const titulo = tipoOracion(o.puesto);
  const entidad = tipoNombre(o.entidad);
  const lugarTxt = tipoNombre(lugar);
  const venceIso = fechaIso(o.fin);
  const vence = venceIso ? venceIso.split("-").reverse().join("/") : "";
  const sueldo = dinero(o.sueldo);
  const resumen = `Convocatoria de ${entidad} en ${lugarTxt}: ${o.vacantes ?? 1} ${o.vacantes === 1 ? "vacante" : "vacantes"}, ${sueldo === "A tratar" ? "sueldo a tratar" : `sueldo de ${sueldo}`}${vence ? `. Postula hasta el ${vence}` : ""}.`;
  const nombres = { "EXPERIENCIA": "Experiencia", "FORMACIÓN ACADÉMICA": "Formación académica", "ESPECIALIZACIÓN": "Especialización", "CONOCIMIENTO": "Conocimientos", "COMPETENCIAS": "Competencias" };
  let cuerpo = "## Requisitos\n";
  for (const [clave, items] of Object.entries(d.secciones)) {
    if (!items.length) continue;
    cuerpo += `\n**${nombres[clave] ?? tipoOracion(clave)}**\n\n` + items.map((x) => `- ${tipoOracion(viñeta(x)).replace(/\n- (\w)/g, (_, c) => `\n- ${c.toUpperCase()}`)}`).join("\n") + "\n";
  }
  cuerpo += `\n## Cómo postular\n\nRevisa las bases completas y postula según las indicaciones de ${entidad}${d.enlace ? ` en su [página de convocatorias](${d.enlace})` : ""}.\n\n`;
  cuerpo += `- **Número de convocatoria:** ${o.convocatoria ?? "—"}\n`;
  if (d.aviso) cuerpo += `- **Aviso en Talento Perú (SERVIR):** N° ${d.aviso} — búscalo en el [portal de Talento Perú](${PORTAL}) eligiendo Ica.\n`;
  cuerpo += `- **Publicado del** ${o.inicio ?? "—"} **al** ${o.fin ?? "—"}\n`;

  return `---
title: ${yaml(titulo)}
empresa: ${yaml(entidad)}
categoria: convocatorias-del-estado
provincia: ${provincia}
distrito: ${yaml(lugarTxt)}
date: ${fechaIso(o.inicio)}
vence: ${venceIso}
sueldo: ${yaml(sueldo)}
fuente: ${yaml(fuente)}
resumen: ${yaml(resumen)}
modalidad: presencial
${opcionales}vacantes: ${o.vacantes ?? ""}
# Importada automáticamente de Talento Perú (SERVIR). Revísala antes de aprobar.
origen: "Talento Perú (SERVIR)"
servir_aviso: ${yaml(d.aviso ?? "")}
---

${cuerpo}`;
}

/* ---------- Programa principal ---------- */

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });
  fs.mkdirSync(path.dirname(VISTOS), { recursive: true });
  const vistos = new Set(fs.existsSync(VISTOS) ? JSON.parse(fs.readFileSync(VISTOS, "utf8")) : []);
  // También cuenta como vista cualquier oferta que ya tenga su número de aviso en el sitio
  const publicadas = path.join(RAIZ, "content", "ofertas");
  for (const f of fs.existsSync(publicadas) ? fs.readdirSync(publicadas).filter((x) => x.endsWith(".md")) : []) {
    const m = fs.readFileSync(path.join(publicadas, f), "utf8").match(/servir_aviso:\s*"?(\d+)/);
    if (m) vistos.add(m[1]);
  }

  // 1. Abrir el portal y buscar las ofertas de Ica
  let pagina = await pedir(LISTA);
  const buscar = botonPorTitulo(pagina, "Buscar");
  if (!buscar) throw new Error("No encontré el botón Buscar en Talento Perú: el portal pudo cambiar.");
  let vs = viewState(pagina);
  pagina = await ajax(vs, buscar);
  vs = viewState(pagina) ?? vs;
  const total = pagina.match(/Página \d+ de (\d+)/)?.[1];
  console.log(`Talento Perú: ${total ?? "?"} página(s) de ofertas en Ica`);

  const nuevas = [];
  const revisar = [];
  let nPagina = 1;
  while (true) {
    const lista = leerLista(pagina);
    console.log(`  Página ${nPagina}: ${lista.length} ofertas`);
    for (let i = 0; i < lista.length && nuevas.length < MAX; i++) {
      const o = lista[i];
      if (!/^ICA\b/i.test(o.ubicacion)) continue; // por si acaso: solo la región Ica
      // 2. Abrir el detalle (botón "¡Ver más!" de esa fila)
      const html = await pedir(LISTA, formulario(vs, { [`frmLstOfertsLabo:idPnlRepeatPuestos:${i}:j_idt78`]: "" }));
      const d = leerDetalle(html);
      if (!d.aviso) { console.warn(`    ! Sin número de aviso: ${o.puesto} (se omite)`); continue; }
      if (vistos.has(d.aviso)) continue;
      const lugar = o.ubicacion.split(" - ").slice(1).join(" - ") || "Ica";
      const { provincia, segura } = provinciaDe(lugar);
      // Datos mal cargados en el portal: se corrigen con el detalle o se marcan para revisión
      const avisos = [];
      if (!puestoValido(o.puesto)) {
        if (puestoValido(d.titulo)) o.puesto = d.titulo;
        else { o.puesto = "Puesto por confirmar"; avisos.push("el portal no indica el nombre del puesto"); }
      }
      const montoSueldo = Number(String(o.sueldo ?? "").match(/\d[\d,]*(?:\.\d+)?/)?.[0]?.replace(/,/g, "") ?? 0);
      if (montoSueldo && montoSueldo < SUELDO_MINIMO) { avisos.push(`el sueldo publicado (${o.sueldo}) es menor al mínimo, se puso "A tratar"`); o.sueldo = ""; }
      const nombre = `${slugDe(`${o.puesto} ${o.entidad}`)}-${d.aviso}.md`;
      fs.writeFileSync(path.join(SALIDA, nombre), aMarkdown(o, d, provincia, lugar), "utf8");
      vistos.add(d.aviso);
      nuevas.push(`${tipoOracion(o.puesto)} — ${tipoNombre(o.entidad)} (${tipoNombre(lugar)})`);
      if (!segura) avisos.push(`no reconocí el distrito "${lugar}", revisa la provincia`);
      for (const a of avisos) revisar.push(`\`${nombre}\`: ${a}`);
      console.log(`    + ${nombre}`);
    }
    if (nuevas.length >= MAX) break;
    // 3. Siguiente página (al abrir un detalle el portal cambia de vista: se vuelve a buscar y avanzar)
    nPagina++;
    if (total && nPagina > Number(total)) break;
    pagina = await pedir(LISTA);
    vs = viewState(pagina);
    pagina = await ajax(vs, botonPorTitulo(pagina, "Buscar"));
    vs = viewState(pagina) ?? vs;
    for (let p = 1; p < nPagina; p++) {
      const sig = botonSiguiente(pagina);
      if (!sig) { pagina = null; break; }
      pagina = await ajax(vs, sig);
      vs = viewState(pagina) ?? vs;
    }
    if (!pagina) break;
  }

  fs.writeFileSync(VISTOS, JSON.stringify([...vistos].sort(), null, 2) + "\n", "utf8");
  // Resumen para el Pull Request
  const resumen = [
    nuevas.length ? `${nuevas.length} convocatoria(s) nueva(s) de Ica en Talento Perú:\n\n${nuevas.map((n) => `- ${n}`).join("\n")}` : "No hay convocatorias nuevas.",
    revisar.length ? `\n**Revisa:**\n\n${revisar.map((r) => `- ${r}`).join("\n")}` : "",
  ].join("\n");
  fs.writeFileSync(path.join(RAIZ, "data", "ultimo-importe.md"), resumen + "\n", "utf8");
  console.log(`\nListo: ${nuevas.length} nueva(s).`);
}

main().catch((e) => {
  // La causa real de un error de red viene en e.cause (ej. ECONNRESET, ETIMEDOUT, certificado)
  const causa = e.cause ? ` (${e.cause.code ?? ""} ${e.cause.message ?? ""})`.replace(/\s+\)/, ")") : "";
  const texto = `${e.message}${causa}`;
  console.error("Error al importar de Talento Perú:", texto);
  // En GitHub Actions, esta línea aparece en el recuadro "Annotations" del resumen
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=Importador de SERVIR::${texto.replace(/\r?\n/g, " ")}`);
  process.exit(1);
});
