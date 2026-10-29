import type { Metadata } from "next";
import { categorias } from "@/site.config";
import { getOfertas } from "@/lib/content";
import ListaOfertas from "@/components/ListaOfertas";

type Props = { params: Promise<{ categoria: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return categorias.map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const cat = categorias.find((c) => c.slug === categoria)!;
  return { title: `${cat.nombre} en Ica`, description: cat.descripcion };
}

export default async function Categoria({ params }: Props) {
  const slug = (await params).categoria;
  const cat = categorias.find((c) => c.slug === slug)!;
  return (
    <ListaOfertas
      titulo={`${cat.icono} ${cat.nombre}`}
      descripcion={cat.descripcion}
      ofertas={getOfertas().filter((o) => o.categoria === slug)}
      activo={slug}
    />
  );
}
