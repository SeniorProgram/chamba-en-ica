"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { PROVINCIAS_MAPA, VISTA_MAPA } from "@/lib/mapa-ica";
import { Icono, useHoy } from "./OfertaCard";

type OfertaMapa = { provincia: string; vence: string; empresa: string };

/**
 * Mapa interactivo de la región Ica: cada provincia se pinta según cuántas ofertas vigentes tiene.
 * Al pasar el cursor (por el mapa o por la lista) se resalta; al hacer clic lleva a sus ofertas.
 */
export default function MapaIca({ ofertas, guias }: { ofertas: OfertaMapa[]; guias: number }) {
  const hoy = useHoy();
  const [activa, setActiva] = useState<string | null>(null);
  // Hasta saber la fecha de hoy (en el navegador) se cuentan todas; luego solo las vigentes
  const vigentes = ofertas.filter((o) => !hoy || !o.vence || o.vence >= hoy);
  const conteo = Object.fromEntries(PROVINCIAS_MAPA.map((p) => [p.slug, vigentes.filter((o) => o.provincia === p.slug).length]));
  const maximo = Math.max(1, ...Object.values(conteo));
  const empresas = new Set(vigentes.map((o) => o.empresa.toLowerCase())).size;
  const intensidad = (n: number) => (n ? Math.round(28 + (n / maximo) * 62) : 10); // % de azul

  const cifras = [
    { valor: vigentes.length, texto: "ofertas vigentes" },
    { valor: empresas, texto: "empresas y entidades contratando" },
    { valor: guias, texto: "guías para postular" },
  ];

  return (
    <section className="mapa-seccion" aria-labelledby="mapa-titulo">
      <div className="contenedor contenedor-ancho">
        <h2 id="mapa-titulo" className="mapa-titulo">Nuestras cifras en la región</h2>
        <div className="cifras">
          {cifras.map((c) => (
            <div key={c.texto} className="cifra">
              <strong>+{c.valor.toLocaleString("es-PE")}</strong>
              <span>{c.texto}</span>
            </div>
          ))}
        </div>

        <p className="mapa-indicacion">Elige tu provincia para ver sus ofertas de trabajo</p>
        <div className="mapa-cuerpo">
          <svg viewBox={VISTA_MAPA} className="mapa-svg" role="group" aria-label="Mapa de las provincias de la región Ica">
            {PROVINCIAS_MAPA.map((p) => (
              <Link
                key={p.slug}
                href={`/provincia/${p.slug}/`}
                aria-label={`${p.nombre}: ${conteo[p.slug]} ofertas`}
                className={`mapa-provincia ${activa === p.slug ? "activa" : ""}`}
                style={{ "--intensidad": `${intensidad(conteo[p.slug])}%` } as CSSProperties}
                onMouseEnter={() => setActiva(p.slug)}
                onMouseLeave={() => setActiva(null)}
                onFocus={() => setActiva(p.slug)}
                onBlur={() => setActiva(null)}
              >
                <path d={p.d} />
              </Link>
            ))}
            {/* Nombres encima de todas las provincias (no reciben el cursor). Palpa es angosta: su nombre va afuera */}
            {PROVINCIAS_MAPA.map((p) => {
              const fuera = p.slug === "palpa";
              const [x, y] = fuera ? [p.centro[0] + 62, p.centro[1] - 6] : p.centro;
              return (
                <g key={p.slug} className={`mapa-etiqueta ${fuera ? "fuera" : ""} ${activa === p.slug ? "activa" : ""}`} aria-hidden>
                  {fuera && <line x1={p.centro[0] + 4} y1={p.centro[1]} x2={x - 6} y2={y - 6} />}
                  <text x={x} y={y} textAnchor={fuera ? "start" : "middle"}>{p.nombre}</text>
                  <text x={x} y={y + 24} textAnchor={fuera ? "start" : "middle"} className="mapa-numero">
                    {conteo[p.slug]} {conteo[p.slug] === 1 ? "oferta" : "ofertas"}
                  </text>
                </g>
              );
            })}
          </svg>

          <ul className="mapa-lista">
            {PROVINCIAS_MAPA.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/provincia/${p.slug}/`}
                  className={`mapa-item ${activa === p.slug ? "activa" : ""}`}
                  onMouseEnter={() => setActiva(p.slug)}
                  onMouseLeave={() => setActiva(null)}
                  onFocus={() => setActiva(p.slug)}
                  onBlur={() => setActiva(null)}
                >
                  <span className="mapa-muestra" style={{ "--intensidad": `${intensidad(conteo[p.slug])}%` } as CSSProperties} aria-hidden />
                  <span className="mapa-item-texto">
                    <strong>{p.nombre}</strong>
                    <span>{conteo[p.slug]} {conteo[p.slug] === 1 ? "oferta vigente" : "ofertas vigentes"}</span>
                  </span>
                  <span className="mapa-ver">Ver ofertas <Icono nombre="derecha" tam={15} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
