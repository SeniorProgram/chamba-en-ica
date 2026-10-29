#!/usr/bin/env node
/**
 * Completa jornada, experiencia y estudios de las ofertas ya publicadas que no los tengan,
 * leyendo sus requisitos (secciones "Experiencia" y "Formación académica" del texto).
 * Solo agrega campos que faltan: nunca cambia lo que ya está escrito.
 *
 * Uso:  node scripts/completar-campos.mjs [--probar]   (--probar muestra los cambios sin guardar)
 */
import fs from "node:fs";
import path from "node:path";
import { inferirEducacion, inferirExperiencia, inferirJornada } from "./inferir-campos.mjs";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const DIR = path.join(RAIZ, "content", "ofertas");
const PROBAR = process.argv.includes("--probar");

// Texto de una sección en negrita del cuerpo: **Experiencia** ... hasta la siguiente sección
function seccion(cuerpo, nombre) {
  const i = cuerpo.indexOf(`**${nombre}**`);
  if (i < 0) return "";
  const resto = cuerpo.slice(i + nombre.length + 4);
  const fin = resto.search(/\n\*\*|\n## /);
  return fin < 0 ? resto : resto.slice(0, fin);
}

let cambiadas = 0;
for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
  const ruta = path.join(DIR, archivo);
  const texto = fs.readFileSync(ruta, "utf8");
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) continue;
  let [, cabecera, cuerpo] = m;
  const tiene = (campo) => new RegExp(`^${campo}:\\s*\\S`, "m").test(cabecera);
  const esEstado = /^categoria:\s*convocatorias-del-estado/m.test(cabecera);

  const nuevos = {};
  if (!tiene("jornada")) nuevos.jornada = inferirJornada(cuerpo, esEstado);
  if (!tiene("experiencia")) nuevos.experiencia = inferirExperiencia(seccion(cuerpo, "Experiencia"));
  if (!tiene("educacion")) nuevos.educacion = inferirEducacion(seccion(cuerpo, "Formación académica"));
  const lineas = Object.entries(nuevos).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
  if (!lineas.length) continue;

  // Se agregan después de "modalidad:" (o al final de la cabecera si no está)
  cabecera = /^modalidad:.*$/m.test(cabecera)
    ? cabecera.replace(/^(modalidad:.*)$/m, `$1\n${lineas.join("\n")}`)
    : `${cabecera}\n${lineas.join("\n")}`;
  console.log(`${archivo}\n   + ${lineas.join(" · ")}`);
  if (!PROBAR) fs.writeFileSync(ruta, `---\n${cabecera}\n---\n${cuerpo}`, "utf8");
  cambiadas++;
}
console.log(`\n${cambiadas} oferta(s) ${PROBAR ? "se completarían" : "completadas"}.`);
