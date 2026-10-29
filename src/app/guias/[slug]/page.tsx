import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatFecha, getGuia, getGuias } from "@/lib/content";
import Anuncio from "@/components/Anuncio";
import { TarjetaGuia } from "@/components/Tarjetas";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getGuias().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guia = getGuia((await params).slug);
  if (!guia) return {};
  return {
    title: guia.title,
    description: guia.description,
    alternates: { canonical: `/guias/${guia.slug}/` },
    openGraph: { title: guia.title, description: guia.description, type: "article" },
  };
}

export default async function GuiaPage({ params }: Props) {
  const guia = getGuia((await params).slug);
  if (!guia) notFound();
  const otras = getGuias().filter((g) => g.slug !== guia.slug).slice(0, 3);

  return (
    <article className="contenedor angosto">
      <header className="cabecera-pagina">
        <div className="migas entrada">
          <Link href="/">Inicio</Link> › <Link href="/guias/">Información</Link>
        </div>
        <h1 className="entrada entrada-2">{guia.title}</h1>
        <p className="muted entrada entrada-3">Actualizado el {formatFecha(guia.updated)}</p>
      </header>
      <Anuncio />
      <div className="prosa entrada entrada-3" dangerouslySetInnerHTML={{ __html: guia.html }} />
      <Anuncio />
      <section style={{ paddingBottom: 64 }}>
        <h2 className="revelar">Sigue leyendo</h2>
        <div className="grilla" style={{ marginTop: 16 }}>
          {otras.map((g, i) => (
            <TarjetaGuia key={g.slug} guia={g} i={i} />
          ))}
        </div>
      </section>
    </article>
  );
}
