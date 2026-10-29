@echo off
rem Busca convocatorias nuevas de Ica en Talento Peru (SERVIR) y abre un Pull Request en GitHub.
rem Doble clic para correrlo, o programalo cada manana con el Programador de tareas (ver README).
chcp 65001 >nul
cd /d "%~dp0"
node scripts\importar-local.mjs
rem Si se abrio con doble clic, espera para que puedas leer el resultado
if "%1"=="" pause
