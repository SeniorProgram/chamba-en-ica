#!/usr/bin/env node
/**
 * Corre el importador de Talento Perú (SERVIR) desde esta PC y propone las ofertas nuevas en GitHub.
 *
 * SERVIR rechaza las conexiones de los servidores de GitHub (403), así que el importe se hace aquí, en Perú.
 * Para no tocar tus archivos (ni cambios sin guardar), trabaja en una copia aparte del repositorio
 * (git worktree), sube la rama "importar/servir" y abre un Pull Request para que lo revises.
 *
 * Uso:  npm run importar:proponer      (o doble clic en importar-convocatorias.bat)
 * Requiere: Git y, para abrir el Pull Request solo, GitHub CLI (gh) con sesión iniciada.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const RAMA = "importar/servir";
const COPIA = path.join(os.tmpdir(), "chamba-en-ica-importar");
const REPO_WEB = "https://github.com/SeniorProgram/chamba-en-ica";

const git = (args, cwd = RAIZ) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
// GitHub CLI: se llama directo (sin shell) para que los textos con espacios lleguen enteros
const GH = [process.env.GH_PATH, "gh", "C:/Program Files/GitHub CLI/gh.exe"].find((c) => c && spawnSync(c, ["--version"], { stdio: "ignore" }).status === 0);
const gh = (args, opciones = {}) => spawnSync(GH, args, { cwd: RAIZ, encoding: "utf8", ...opciones });
const paso = (t) => console.log(`\n▶ ${t}`);

function limpiarCopia() {
  try { git(["worktree", "remove", "--force", COPIA]); } catch { /* no existía */ }
  fs.rmSync(COPIA, { recursive: true, force: true });
  try { git(["worktree", "prune"]); } catch { /* nada que limpiar */ }
}

try {
  paso("Trayendo la última versión de GitHub");
  git(["fetch", "--quiet", "origin", "main"]);

  paso("Preparando una copia aparte (tus archivos no se tocan)");
  limpiarCopia();
  git(["worktree", "add", "--quiet", "--force", "-B", RAMA, COPIA, "origin/main"]);

  // Varias fuentes: si una falla, las demás igual se importan
  const fuentes = [
    { nombre: "Talento Perú (SERVIR)", script: "importar-servir.mjs", resumen: "ultimo-importe.md" },
    { nombre: "Talento Perú – Prácticas", script: "importar-servir-practicas.mjs", resumen: "ultimo-importe-practicas.md" },
    { nombre: "Empleos Perú (MTPE)", script: "importar-empleosperu.mjs", resumen: "ultimo-importe-empleosperu.md" },
  ];
  const resumenes = [];
  for (const f of fuentes) {
    paso(`Buscando ofertas nuevas de Ica en ${f.nombre} (tarda 1 o 2 minutos)`);
    const r = spawnSync(process.execPath, [path.join(COPIA, "scripts", f.script)], { cwd: COPIA, stdio: "inherit" });
    if (r.status !== 0) { console.log(`⚠ ${f.nombre} falló (mira el mensaje de arriba); sigo con lo demás.`); continue; }
    const archivo = path.join(COPIA, "data", f.resumen);
    if (fs.existsSync(archivo)) resumenes.push(`### ${f.nombre}\n\n${fs.readFileSync(archivo, "utf8").trim()}`);
  }
  if (!resumenes.length) throw new Error("Ninguna fuente se pudo importar.");

  // Se agrega y se mira lo que de verdad cambió (git status puede marcar archivos solo por los saltos de línea de Windows)
  // Solo las rutas que existen (git falla si se le pasa una que no existe)
  const rutas = ["content/ofertas", "public/img/empresas", "data/servir-vistos.json", "data/servir-practicas-vistos.json", "data/empleosperu-vistos.json"]
    .filter((r) => fs.existsSync(path.join(COPIA, r)));
  git(["add", ...rutas], COPIA);
  const cambios = git(["diff", "--cached", "--name-only"], COPIA);
  if (!cambios) {
    console.log("\n✔ No hay convocatorias nuevas. Nada que revisar hoy.");
  } else {
    const resumen = resumenes.join("\n\n") + "\n";
    paso("Subiendo las ofertas nuevas a la rama " + RAMA);
    git(["commit", "--quiet", "-m", "Importa ofertas nuevas de Talento Perú (SERVIR, empleos y prácticas) y Empleos Perú (MTPE)"], COPIA);
    git(["push", "--quiet", "--force", "origin", RAMA], COPIA);

    paso("Abriendo el Pull Request para revisar");
    const cuerpo = path.join(os.tmpdir(), "chamba-importe-resumen.md");
    fs.writeFileSync(cuerpo, resumen, "utf8");
    let enlace = `${REPO_WEB}/compare/main...${RAMA}?expand=1`;
    if (GH) {
      const abierto = gh(["pr", "view", RAMA, "--json", "url,state", "-q", "select(.state==\"OPEN\") | .url"]);
      if (abierto.status === 0 && abierto.stdout.trim()) {
        gh(["pr", "edit", RAMA, "--body-file", cuerpo], { stdio: "ignore" });
        enlace = abierto.stdout.trim();
        console.log("Se actualizó el Pull Request que ya estaba abierto.");
      } else {
        const nuevo = gh(["pr", "create", "--base", "main", "--head", RAMA, "--title", "Ofertas nuevas de Ica (Talento Perú y Empleos Perú)", "--body-file", cuerpo]);
        if (nuevo.status === 0) enlace = nuevo.stdout.trim().split("\n").pop();
        else console.log("No se pudo crear el Pull Request con gh (" + (nuevo.stderr || "").trim() + "); ábrelo desde el enlace de abajo.");
      }
    } else {
      console.log("GitHub CLI (gh) no está instalado: abre el Pull Request desde el enlace.");
    }
    console.log(`\n${resumen}\n✔ Revisa y aprueba aquí: ${enlace}`);
  }
} catch (e) {
  console.error(`\n✖ ${e.message}`);
  if (e.stderr) console.error(String(e.stderr).trim());
  process.exitCode = 1;
} finally {
  limpiarCopia();
}
