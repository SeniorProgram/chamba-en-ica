"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icono, ListaTarjetas, useHoy, type OfertaResumen } from "./OfertaCard";

/** ¿Ya pasó la fecha límite? Se calcula en el navegador: la página se compila antes y la fecha cambia cada día */
function useCerrada(vence: string) {
  const hoy = useHoy();
  return Boolean(hoy && vence && vence < hoy);
}

/** Aviso arriba de la ficha cuando la convocatoria ya cerró, con ofertas parecidas que siguen abiertas */
export function AvisoCerrada({ vence, venceTexto, parecidas, masHref, masTexto }: {
  vence: string;
  venceTexto: string;
  parecidas: OfertaResumen[];
  masHref: string;
  masTexto: string;
}) {
  if (!useCerrada(vence)) return null;
  return (
    <section className="panel aviso-cerrada" id="oferta-cerrada" aria-labelledby="titulo-cerrada">
      <p className="aviso-cerrada-cab">
        <Icono nombre="alerta" tam={24} />
        <span>
          <strong id="titulo-cerrada">Esta convocatoria ya cerró</strong>
          El plazo para postular terminó el {venceTexto}. Te dejamos el detalle como referencia
          {parecidas.length ? "; mira estas ofertas parecidas que siguen abiertas:" : "."}
        </span>
      </p>
      {parecidas.length > 0 && <ListaTarjetas ofertas={parecidas} />}
      <p className="centro">
        <Link href={masHref} className="enlace-flecha">{masTexto} <Icono nombre="derecha" tam={16} /></Link>
      </p>
    </section>
  );
}

/** Muestra el botón de postular mientras está abierta; si cerró, muestra `cerrado` en su lugar */
export function SiAbierta({ vence, children, cerrado }: { vence: string; children: ReactNode; cerrado: ReactNode }) {
  return <>{useCerrada(vence) ? cerrado : children}</>;
}
