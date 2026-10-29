import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatFecha, getGuia, getGuias } from "@/lib/content";
import Anuncio from "@/components/Anuncio";
import Cabecera from "@/components/Cabecera";
import { GuiaMini, gruposGuias } from "@/components/Tarjetas";
import { Icono } from "@/components/OfertaCard";

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
  const otras = getGuias().filter((g) => g.slug !== guia.slug).slice(0, 4);
  const grupo = gruposGuias.find((g) => g.id === guia.grupo);
  // Unas 200 palabras por minuto
  const minutos = Math.max(1, Math.round(guia.html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 200));

  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera migas={[{ href: "/guias/", texto: "Información" }, { texto: grupo?.corto ?? "Guía" }]} />

        <div className="layout layout-der">
          <article className="principal panel panel-articulo">
            <div className="oc-top">
              <span className="badge">{grupo?.corto ?? "Guía"}</span>
              <span className="oc-fecha">Actualizado el {formatFecha(guia.updated)} · {minutos} min de lectura</span>
            </div>
            <h1 className="articulo-titulo">{guia.title}</h1>
            <p className="articulo-bajada">{guia.description}</p>
            {guia.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="articulo-portada" src={guia.imagen} alt={guia.imagenAlt} width={1200} height={630} />
            )}
            <Anuncio />
            <div className="prosa" dangerouslySetInnerHTML={{ __html: guia.html }} />
            <p className="aviso">
              La información es referencial y no reemplaza la asesoría de un abogado o contador.
            </p>
          </article>

          <aside className="lateral lateral-pegado">
            {guia.secciones.length > 2 && (
              <nav className="panel" aria-label="En esta guía">
                <p className="panel-titulo">En esta guía</p>
                <ol className="indice">
                  {guia.secciones.map((s) => <li key={s.id}><a href={`#${s.id}`}>{s.titulo}</a></li>)}
                </ol>
              </nav>
            )}
            <Link href="/empleos/" className="panel-publica">
              <strong>Busca tu próxima chamba</strong>
              <span>Ofertas vigentes en Ica, Chincha, Pisco, Nasca y Palpa.</span>
            </Link>
          </aside>
        </div>

        <section className="seguir-leyendo">
          <h2>Sigue leyendo</h2>
          <div className="grilla-minis">
            {otras.map((g) => <GuiaMini key={g.slug} guia={g} />)}
          </div>
          <p><Link href="/guias/" className="enlace-flecha">Ver todas las guías <Icono nombre="derecha" tam={16} /></Link></p>
        </section>
      </div>
    </div>
  );
}
