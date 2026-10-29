# Chamba en Ica

Portal de empleos y convocatorias de la región Ica, hecho con **Next.js** y contenido en **Markdown**.
Genera un sitio 100 % estático: rápido, bueno para Google y gratis de alojar.

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- Git

## Cómo correrlo en tu PC

```bash
npm install      # solo la primera vez
npm run dev      # abre http://localhost:3000
```

Cada vez que guardas un archivo, la página se actualiza sola.

Para generar la versión final (carpeta `out/`):

```bash
npm run build
npm start        # sirve la carpeta out/ para revisarla
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

- [ ] Cambiar `contactEmail` en `src/site.config.ts` por tu correo real.
- [ ] Cambiar `url` en `src/site.config.ts` por tu dominio final.
- [ ] Publicar las primeras ofertas reales.
