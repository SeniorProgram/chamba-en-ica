# Chamba en Ica

Portal de empleos y convocatorias de la región Ica, hecho con **Next.js** y contenido en **Markdown**.
Las páginas se generan al compilar (rápidas y buenas para Google) y el verificador de avisos con IA usa una pequeña función en el servidor de Vercel.

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- Git

## Cómo correrlo en tu PC

```bash
npm install      # solo la primera vez
npm run dev      # abre http://localhost:3000
```

Cada vez que guardas un archivo, la página se actualiza sola.

Para probar la versión final:

```bash
npm run build
npm start        # sirve la versión compilada en http://localhost:3000
```

## Dónde está cada cosa

```
content/
  guias/       → artículos del Centro de información (un .md por guía)
  ofertas/     → ofertas de empleo (un .md por oferta)
  _plantilla-oferta.md → modelo de oferta (vista en /ofertas/ejemplo/)
  paginas/     → Sobre nosotros, Contacto, Política de privacidad
src/
  site.config.ts   → nombre, URL, correo, categorías y provincias
  app/             → páginas y rutas
  components/      → encabezado, pie, tarjetas, anuncios, animaciones
  app/globals.css  → colores, diseño y animaciones
```

## Publicar una oferta nueva

Lo más fácil es usar el panel: entra a `/admin/`, elige **Ofertas de empleo → Nuevo** y llena el formulario.
También puedes hacerlo a mano:

1. Copia `content/_plantilla-oferta.md` dentro de `content/ofertas/` y renómbrala, por ejemplo `cajero-tottus-ica.md`
   (el nombre del archivo será la dirección: `/ofertas/cajero-tottus-ica/`).
2. Llena los datos de arriba: título, empresa, categoría, provincia, fechas, sueldo y **enlace a la fuente oficial**.
3. Escribe requisitos, funciones y cómo postular.
4. Guarda, haz `git add . && git commit -m "Nueva oferta" && git push`. Vercel lo publica solo en 1 minuto.

La etiqueta "Vigente / Vencida" se calcula sola con la fecha `vence`.

Los campos opcionales `jornada`, `modalidad`, `experiencia`, `educacion`, `vacantes` y `distrito` alimentan los
filtros del buscador (`/empleos/` y `/buscar/`). Si una oferta no los tiene, igual aparece, pero no saldrá al
filtrar por ese dato. Para el filtro de sueldo se toma el primer número de `sueldo` ("S/ 1,500 a 2,000" → 1500);
si el aviso dice "A tratar", puedes poner `sueldo_min: 1500` aparte.
Puedes ver cómo queda una oferta en `/ofertas/ejemplo/` (no sale en Google ni en los listados).

## Publicar una guía nueva

Crea un `.md` en `content/guias/` con este encabezado:

```yaml
---
title: "Título de la guía"
description: "Resumen de 1 o 2 líneas (sale en Google)"
date: 2026-11-01
updated: 2026-11-01
grupo: beneficios   # beneficios | postula | cuidate
---
```

## Subirlo a internet (gratis con Vercel)

1. Crea un repositorio en GitHub (por ejemplo `chamba-en-ica`) y sube el proyecto:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/chamba-en-ica.git
   git push -u origin main
   ```
2. Entra a [vercel.com](https://vercel.com), inicia sesión con GitHub y elige **Add New → Project**.
3. Importa el repositorio y pulsa **Deploy**. Vercel detecta Next.js solo.
4. Cuando compres tu dominio, agrégalo en Vercel (**Settings → Domains**) y cambia `url` en `src/site.config.ts`.

## Activar Google AdSense

1. Postula en AdSense con tu dominio propio (Google no aprueba subdominios gratuitos como `.vercel.app`).
2. Cuando te den tu código de editor (`ca-pub-XXXXXXXXXXXXXXXX`), en Vercel ve a
   **Settings → Environment Variables** y crea `NEXT_PUBLIC_ADSENSE_CLIENT` con ese valor.
3. Crea el archivo `public/ads.txt` con la línea que te da AdSense.
4. Vuelve a desplegar. Los espacios de anuncio ya están colocados en las guías y listados de ofertas.

## Pendientes antes de lanzar

- [x] Cambiar `contactEmail` en `src/site.config.ts` por tu correo real.
- [ ] Cambiar `url` en `src/site.config.ts` por tu dominio final.
- [ ] Publicar las primeras ofertas reales.

## Importación de convocatorias del Estado (Talento Perú)

`scripts/importar-servir.mjs` busca en el portal **Talento Perú de SERVIR** las convocatorias de la región Ica y
crea una oferta por cada una, con sus requisitos, sueldo, fechas y el enlace oficial de la entidad.

**Se corre desde esta PC** (SERVIR rechaza las conexiones de los servidores de GitHub): doble clic en
`importar-convocatorias.bat` (o `npm run importar:proponer`). En 1 o 2 minutos:

1. Busca las convocatorias nuevas en una copia aparte del proyecto (tus archivos no se tocan).
2. Las sube a la rama `importar/servir` y abre un **Pull Request** "Convocatorias nuevas de Ica (Talento Perú)".
3. Revísalo en GitHub (pestaña *Pull requests*). Vercel crea una vista previa. Para descartar una oferta, borra su
   archivo en el Pull Request; para publicarlas, pulsa **Merge**. Aprueba o cierra el Pull Request antes del siguiente importe.

- Los avisos ya importados (o descartados) se anotan en `data/servir-vistos.json` y no vuelven a aparecer.
- La primera vez inicia sesión en GitHub CLI: `gh auth login`.
- El mismo importe trae también las **prácticas del Estado** (`scripts/importar-servir-practicas.mjs`) y las ofertas
  privadas de **Empleos Perú** (`scripts/importar-empleosperu.mjs`). Ninguno corre en GitHub: SERVIR y Empleos Perú
  no responden a conexiones de fuera del Perú.
- **Corre solo cada día a las 8:00 a. m.:** tarea "Chamba en Ica - Importar convocatorias" del *Programador de tareas*
  de Windows (corre `importar-convocatorias.bat auto`). La PC debe estar encendida; si estaba apagada, corre al prenderla.

## Formulario "Publica tu oferta" (para empresas)

La página `/publica/` tiene un formulario para que las empresas te envíen sus ofertas. Te llegan por correo
como una ficha ordenada; tú decides si la publicas (con el panel `/admin/` o con la skill de abajo).

- **Sin configurar nada:** el formulario abre el correo de quien publica con la oferta ya escrita, dirigida a
  `contactEmail` de `src/site.config.ts` (¡cámbialo por tu correo real!).
- **Recomendado:** crea una clave gratis en [web3forms.com](https://web3forms.com) con tu correo y guárdala en Vercel
  (**Settings → Environment Variables**) como `NEXT_PUBLIC_WEB3FORMS_KEY`. Luego vuelve a desplegar. Así las
  ofertas se envían directo desde la página, sin abrir el correo de nadie.

## Crear una oferta pegando un aviso (skill de Claude Code)

En Claude Code, dentro de esta carpeta, pega el texto o el enlace de un aviso (Facebook, WhatsApp, la web de la
empresa o el correo del formulario) y escribe `/nueva-oferta` (o "crea esta oferta"). La skill
`.claude/skills/nueva-oferta/` llena todos los campos, revisa señales de estafa, te muestra un resumen y la
publica cuando confirmas.

## Verificador de avisos con IA (`/verificar/`)

La persona pega un aviso que le llegó por WhatsApp o Facebook y la página le dice si tiene señales de estafa.

- **Sin configurar nada** ya funciona la *revisión básica*: busca en el navegador las señales de la guía de ofertas falsas
  (`src/lib/verificar.ts`). No cuesta nada.
- **Con IA (Claude):** crea una clave en [console.anthropic.com](https://console.anthropic.com) y en Vercel ve a
  **Settings → Environment Variables** y agrega `ANTHROPIC_API_KEY`. Vuelve a desplegar. El endpoint está en
  `src/app/api/verificar/route.ts`.
- **Costo:** por defecto usa `claude-opus-5-5` con esfuerzo bajo. Para gastar mucho menos, agrega en Vercel
  `CLAUDE_MODEL` = `claude-haiku-5-5`. Pon además un **límite de gasto mensual** en la consola de Anthropic.
- Cada persona puede hacer 8 consultas por hora. El texto pegado no se guarda (está explicado en la política de privacidad).

## Alertas de empleo por correo (`/alertas/`)

La persona elige tipos de trabajo y provincias, confirma su correo y recibe las ofertas nuevas que coinciden (máximo
un correo al día). Hasta que no se configuran las claves, la página dice "muy pronto" y no aparece en el menú.

1. **Base de datos:** en Vercel → **Storage** → **Create** → **Upstash for Redis** (plan gratis) y conéctala al proyecto.
   Crea sola `KV_REST_API_URL` y `KV_REST_API_TOKEN`.
2. **Correos:** crea una cuenta gratis en [brevo.com](https://www.brevo.com) (300 correos al día). En **Senders** verifica
   el correo remitente y en **SMTP & API → API Keys** crea una clave. En Vercel agrega `BREVO_API_KEY` y
   `ALERTAS_REMITENTE` (ese correo). Con un dominio propio, autentícalo en Brevo para que los correos no caigan en spam.
3. **Envío diario:** agrega en Vercel `CRON_SECRET` con una clave larga inventada. `vercel.json` lanza
   `/api/alertas/enviar/` todos los días a las 12:00 m. (hora de Perú). El primer envío solo marca las ofertas que ya
   existían; desde el siguiente se avisan las nuevas.
4. Vuelve a desplegar (**Deployments → Redeploy**) para que la página de alertas se active.

Código: `src/lib/alertas.ts` y `src/app/api/alertas/`. Las ofertas que se avisan salen de `/api/alertas/ofertas/`, que se
genera al compilar con cada publicación.

## Mapa de la región (inicio)

El mapa interactivo de las 5 provincias está en `src/components/MapaIca.tsx`. Los límites (`src/lib/mapa-ica.ts`) son una
conversión del repositorio [peru-geojson](https://github.com/juaneladio/peru-geojson) (datos del INEI), con licencia
Mozilla Public License 2.0. Los colores y números de cada provincia se calculan solos con las ofertas vigentes.
