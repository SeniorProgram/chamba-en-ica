import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categorias, provincias } from "@/site.config";
import { formatFecha, getOferta, getOfertaEjemplo, getOfertas } from "@/lib/content";
import EstadoOferta from "@/components/EstadoOferta";
import Anuncio from "@/components/Anuncio";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

// /ofertas/ejemplo/ siempre existe: muestra la plantilla para que veas cómo queda una oferta
const buscar = (slug: string) => (slug === "ejemplo" ? getOfertaEjemplo() : getOferta(slug));

export function generateStaticParams() {
  return [{ slug: "ejemplo" }, ...getOfertas().map((o) => ({ slug: o.slug }))];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const o = buscar(slug);
  if (!o) return {};
  return {
    title: `${o.title} – ${o.empresa}`,
    description: o.resumen,
    robots: slug === "ejemplo" ? { index: false, follow: false } : undefined,
  };
}

export default async function OfertaPage({ params }: Props) {
  const { slug } = await params;
  const o = buscar(slug);
  if (!o) notFound();
  const esEjemplo = slug === "ejemplo";
  const cat = categorias.find((c) => c.slug === o.categoria);
  const prov = provincias.find((p) => p.slug === o.provincia);

  // Datos estructurados para que Google muestre la oferta en su buscador de empleos
  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: o.title,
    description: o.html,
    datePosted: o.date,
    validThrough: o.vence || undefined,
    hiringOrganization: { "@type": "Organization", name: o.empresa },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: prov?.nombre, addressRegion: "Ica", addressCountry: "PE" },
    },
  };

  return (
    <article className="contenedor angosto">
      {!esEjemplo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      )}
      {esEjemplo && (
        <p className="vacio" style={{ marginTop: 24 }}>
          👀 Vista de ejemplo: así se verá una oferta. Se genera desde <code>content/ofertas/_plantilla.md</code> y no
          aparece en los listados ni en Google.
        </p>
      )}
      <header className="cabecera-pagina">
        <div className="migas entrada">
          <Link href="/">Inicio</Link> › <Link href={`/empleos/${o.categoria}/`}>{cat?.nombre}</Link>
        </div>
        <h1 className="entrada entrada-2">{o.title}</h1>
        <p className="muted entrada entrada-3">{o.empresa}</p>
      </header>
      <div className="ficha entrada entrada-3">
        <div><b>Estado</b><EstadoOferta vence={o.vence} /></div>
        <div><b>Provincia</b>📍 {prov?.nombre}</div>
        <div><b>Sueldo</b>💰 {o.sueldo}</div>
        <div><b>Publicado</b>{formatFecha(o.date)}</div>
        <div><b>Postula hasta</b>{o.vence ? formatFecha(o.vence) : "Sin fecha límite"}</div>
      </div>
      <Anuncio />
      <div className="prosa">
        <div dangerouslySetInnerHTML={{ __html: o.html }} />
        {o.fuente && (
          <p>
            <a href={o.fuente} className="btn btn-naranja" target="_blank" rel="noopener noreferrer">
              Ver convocatoria oficial ↗
            </a>
          </p>
        )}
        <p className="aviso">
          Chamba en Ica no participa en el proceso de selección y nunca cobra por postular. Verifica siempre los datos
          en la fuente oficial.
        </p>
      </div>
    </article>
  );
}
