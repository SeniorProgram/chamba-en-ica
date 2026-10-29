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

  paso("Buscando convocatorias nuevas de Ica en Talento Perú (tarda 1 o 2 minutos)");
  const r = spawnSync(process.execPath, [path.join(COPIA, "scripts", "importar-servir.mjs")], { cwd: COPIA, stdio: "inherit" });
  if (r.status !== 0) throw new Error("El importador falló (mira el mensaje de arriba).");

  // Se agrega y se mira lo que de verdad cambió (git status puede marcar archivos solo por los saltos de línea de Windows)
  git(["add", "content/ofertas", "data/servir-vistos.json"], COPIA);
  const cambios = git(["diff", "--cached", "--name-only"], COPIA);
  if (!cambios) {
    console.log("\n✔ No hay convocatorias nuevas. Nada que revisar hoy.");
  } else {
    const resumen = fs.readFileSync(path.join(COPIA, "data", "ultimo-importe.md"), "utf8");
    paso("Subiendo las ofertas nuevas a la rama " + RAMA);
    git(["commit", "--quiet", "-m", "Importa convocatorias nuevas de Talento Perú (SERVIR)"], COPIA);
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
        const nuevo = gh(["pr", "create", "--base", "main", "--head", RAMA, "--title", "Convocatorias nuevas de Ica (Talento Perú)", "--body-file", cuerpo]);
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
