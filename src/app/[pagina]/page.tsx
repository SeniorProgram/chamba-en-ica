import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPagina, getPaginas } from "@/lib/content";
import Cabecera from "@/components/Cabecera";

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
    <div className="pagina">
      <div className="contenedor angosto">
        <Cabecera migas={[{ texto: p.title }]} titulo={p.title} descripcion={p.description || undefined} />
        <article className="panel panel-articulo prosa entrada entrada-3" dangerouslySetInnerHTML={{ __html: p.html }} />
      </div>
    </div>
  );
}
