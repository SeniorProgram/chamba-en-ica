"use client";

import { useEffect, useRef } from "react";

const CLAVE = "chamba-intro";
const TAM = 168; // tamaño del logo en pantalla (px)
const PASO = 3; // separación entre granos de arena (px): más chico = logo más definido
const LLEGADA_MS = 1300; // tiempo hasta que todos los granos llegan

type Grano = { tx: number; ty: number; x: number; y: number; r: number; g: number; b: number; retraso: number; fase: number };

/**
 * Animación de entrada (solo la primera visita): granos de arena de Huacachina vuelan desde la derecha,
 * se juntan formando el logo y al final aparece el logo real, nítido. Un toque o una tecla la saltan.
 * El script del <head> (layout) añade "sin-intro" si ya se vio o si la persona pidió reducir el movimiento.
 */
export default function IntroArena() {
  const capa = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const logo = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const raiz = document.documentElement;
    const div = capa.current, canvas = lienzo.current, img = logo.current;
    if (!div || !canvas || !img || raiz.classList.contains("sin-intro")) return;
    try { localStorage.setItem(CLAVE, "1"); } catch { /* sin almacenamiento: igual se muestra una vez por carga */ }

    let cuadro = 0;
    const tiempos: ReturnType<typeof setTimeout>[] = [];
    const terminar = () => {
      cancelAnimationFrame(cuadro);
      tiempos.forEach(clearTimeout);
      div.classList.add("saliendo");
      tiempos.push(setTimeout(() => raiz.classList.add("sin-intro"), 420));
    };
    const saltar = () => terminar();
    div.addEventListener("pointerdown", saltar);
    window.addEventListener("keydown", saltar);

    const iniciar = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const ancho = window.innerWidth, alto = window.innerHeight;
      canvas.width = ancho * dpr; canvas.height = alto * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return terminar();
      ctx.scale(dpr, dpr);

      // El logo real se dibuja aparte y se leen sus píxeles: forma y colores exactos
      const lado = Math.round(TAM * dpr);
      const molde = document.createElement("canvas");
      molde.width = molde.height = lado;
      const m = molde.getContext("2d", { willReadFrequently: true });
      if (!m) return terminar();
      m.drawImage(img, 0, 0, lado, lado);
      const datos = m.getImageData(0, 0, lado, lado).data;

      const caja = img.getBoundingClientRect(); // donde está el logo final en pantalla
      const granos: Grano[] = [];
      for (let y = 0; y < TAM; y += PASO) {
        for (let x = 0; x < TAM; x += PASO) {
          const i = (Math.floor(y * dpr) * lado + Math.floor(x * dpr)) * 4;
          if (datos[i + 3] < 128) continue; // fuera de las esquinas redondeadas
          // Salen desde abajo a la derecha, como el viento que mueve las dunas
          granos.push({
            tx: caja.left + x, ty: caja.top + y,
            x: ancho + Math.random() * ancho * 0.35, y: alto * (0.45 + Math.random() * 0.6),
            r: datos[i], g: datos[i + 1], b: datos[i + 2],
            retraso: Math.random() * 380 + (x / TAM) * 160, fase: Math.random() * Math.PI * 2,
          });
        }
      }

      const inicio = performance.now();
      const arena = [233, 163, 93]; // color arena de Huacachina
      const dibujar = (ahora: number) => {
        const t0 = ahora - inicio;
        ctx.clearRect(0, 0, ancho, alto);
        let llegados = 0;
        for (const p of granos) {
          const t = Math.min(1, Math.max(0, (t0 - p.retraso) / (LLEGADA_MS - 400)));
          const e = 1 - Math.pow(1 - t, 3); // frena al llegar
          const remolino = Math.sin(p.fase + t0 / 140) * (1 - e) * 26;
          const x = p.x + (p.tx - p.x) * e;
          const y = p.y + (p.ty - p.y) * e + remolino;
          // El grano cambia de color arena al color del logo mientras se acerca
          const c = e * e; // se mantiene color arena casi todo el viaje
          ctx.fillStyle = `rgb(${Math.round(arena[0] + (p.r - arena[0]) * c)},${Math.round(arena[1] + (p.g - arena[1]) * c)},${Math.round(arena[2] + (p.b - arena[2]) * c)})`;
          ctx.fillRect(x, y, PASO + 0.6, PASO + 0.6);
          if (t >= 1) llegados++;
        }
        if (llegados < granos.length) cuadro = requestAnimationFrame(dibujar);
        else div.classList.add("formado"); // aparece el logo real encima, nítido
      };
      cuadro = requestAnimationFrame(dibujar);
      tiempos.push(setTimeout(() => div.classList.add("formado"), LLEGADA_MS + 300)); // por si el equipo es lento
      tiempos.push(setTimeout(terminar, LLEGADA_MS + 1150));
    };

    if (img.complete && img.naturalWidth) iniciar();
    else { img.onload = iniciar; img.onerror = terminar; }

    return () => {
      cancelAnimationFrame(cuadro);
      tiempos.forEach(clearTimeout);
      div.removeEventListener("pointerdown", saltar);
      window.removeEventListener("keydown", saltar);
    };
  }, []);

  return (
    <div ref={capa} className="intro" aria-hidden>
      <canvas ref={lienzo} className="intro-lienzo" />
      <div className="intro-centro">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={logo} src="/logo-icono.svg" alt="" width={TAM} height={TAM} className="intro-logo" />
        <p className="intro-marca">Chamba<span> en </span>Ica</p>
      </div>
      <span className="intro-saltar">Toca para continuar</span>
    </div>
  );
}
