@echo off
rem Busca convocatorias nuevas de Ica en Talento Perú (SERVIR) y abre un Pull Request en GitHub para revisarlas.
rem Doble clic para correrlo, o prográmalo cada mañana con el Programador de tareas de Windows (ver README).
chcp 65001 >nul
cd /d "%~dp0"
node scripts\importar-local.mjs
rem Si se abrió con doble clic, espera para que puedas leer el resultado
if "%1"=="" pause
