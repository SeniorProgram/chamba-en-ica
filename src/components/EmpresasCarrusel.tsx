"use client";

import Link from "next/link";
import { useRef } from "react";
import { Icono, LogoEmpresa } from "./OfertaCard";

export type EmpresaDestacada = { nombre: string; ofertas: number };

/** "Estas empresas necesitan tu talento": las que tienen más ofertas vigentes, en un carrusel con flechas. */
export default function EmpresasCarrusel({ empresas, total }: { empresas: EmpresaDestacada[]; total: number }) {
  const pista = useRef<HTMLUListElement>(null);
  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  if (!empresas.length) return null;

  return (
    <section className="empresas-seccion" aria-labelledby="empresas-titulo">
      <div className="contenedor contenedor-ancho">
        <h2 id="empresas-titulo" className="empresas-titulo">Estas empresas necesitan tu talento</h2>
        <div className="carrusel">
          <button type="button" className="carrusel-flecha" onClick={() => mover(-1)} aria-label="Ver empresas anteriores">
            <Icono nombre="derecha" tam={20} />
          </button>
          <ul ref={pista} className="carrusel-pista">
            {empresas.map((e) => (
              <li key={e.nombre}>
                <Link href={`/buscar/?q=${encodeURIComponent(e.nombre)}`} className="empresa-tarjeta">
                  <LogoEmpresa empresa={e.nombre} grande />
                  <strong>{e.nombre}</strong>
                  <span>{e.ofertas} {e.ofertas === 1 ? "oferta" : "ofertas"}</span>
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" className="carrusel-flecha carrusel-siguiente" onClick={() => mover(1)} aria-label="Ver más empresas">
            <Icono nombre="derecha" tam={20} />
          </button>
        </div>
        <p className="centro">
          <Link href="/empleos/" className="btn btn-contorno empresas-boton">
            <Icono nombre="edificio" tam={18} /> Ver las {total} ofertas
          </Link>
        </p>
      </div>
    </section>
  );
}
