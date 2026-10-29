import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPagina, getPaginas } from "@/lib/content";

// Páginas fijas escritas en content/paginas/ (Sobre nosotros, Política de privacidad...)
type Props = { params: Promise<{ pagina: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getPaginas()
    .filter((slug) => slug !== "contacto")
    .map((pagina) => ({ pagina }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getPagina((await params).pagina);
  return p ? { title: p.title, description: p.description } : {};
}

export default async function Pagina({ params }: Props) {
  const p = getPagina((await params).pagina);
  if (!p) notFound();
  return (
    <article className="contenedor angosto">
      <header className="cabecera-pagina">
        <h1 className="entrada">{p.title}</h1>
      </header>
      <div className="prosa entrada entrada-2" dangerouslySetInnerHTML={{ __html: p.html }} />
    </article>
  );
}
