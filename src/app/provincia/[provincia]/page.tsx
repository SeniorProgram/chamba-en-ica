import type { Metadata } from "next";
import { provincias } from "@/site.config";
import ListaOfertas from "@/components/ListaOfertas";

type Props = { params: Promise<{ provincia: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return provincias.map((p) => ({ provincia: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const p = provincias.find((x) => x.slug === provincia)!;
  return {
    title: `Trabajo en ${p.nombre}`,
    description: `Ofertas de empleo, convocatorias CAS y prácticas en la provincia de ${p.nombre}.`,
  };
}

export default async function Provincia({ params }: Props) {
  const slug = (await params).provincia;
  const p = provincias.find((x) => x.slug === slug)!;
  return (
    <ListaOfertas
      titulo={`Trabajo en ${p.nombre}`}
      descripcion={`Ofertas de empleo, convocatorias y prácticas en la provincia de ${p.nombre}.`}
      fijo={{ prov: slug }}
    />
  );
}
