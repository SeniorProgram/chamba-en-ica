import type { Metadata } from "next";
import { Suspense } from "react";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import Buscador, { type Item } from "./Buscador";

export const metadata: Metadata = {
  title: "Buscar",
  robots: { index: false },
};

export default function BuscarPage() {
  // Índice de búsqueda generado al compilar: no necesita servidor ni base de datos
  const items: Item[] = [
    ...getOfertas().map((o) => ({
      tipo: "Oferta" as const,
      titulo: o.title,
      detalle: `${o.empresa} · ${provincias.find((p) => p.slug === o.provincia)?.nombre ?? ""} · ${
        categorias.find((c) => c.slug === o.categoria)?.nombre ?? ""
      }`,
      url: `/ofertas/${o.slug}/`,
      texto: `${o.title} ${o.empresa} ${o.resumen} ${o.provincia} ${o.categoria}`,
    })),
    ...getGuias().map((g) => ({
      tipo: "Guía" as const,
      titulo: g.title,
      detalle: g.description,
      url: `/guias/${g.slug}/`,
      texto: `${g.title} ${g.description} ${g.html.replace(/<[^>]+>/g, " ")}`,
    })),
  ];

  return (
    <div className="contenedor angosto">
      <Suspense>
        <Buscador items={items} />
      </Suspense>
    </div>
  );
}
