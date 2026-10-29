import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categorias, educaciones, experiencias, jornadas, modalidades, provincias } from "@/site.config";
import { formatFecha, getOferta, getOfertaEjemplo, getOfertas } from "@/lib/content";
import Anuncio from "@/components/Anuncio";
import Cabecera from "@/components/Cabecera";
import { EstadoBadge, GuardarOferta, Icono, ListaTarjetas, LogoEmpresa, type NombreIcono } from "@/components/OfertaCard";

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
  const nombre = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre;
  // Tipo de empleo en el formato que entiende Google
  const tipoEmpleo = { "tiempo-completo": "FULL_TIME", "medio-tiempo": "PART_TIME", "por-horas": "PART_TIME", temporal: "TEMPORARY" }[o.jornada as string]
    ?? (o.categoria === "practicas" ? "INTERN" : undefined);

  // Datos estructurados para que Google muestre la oferta en su buscador de empleos
  const jobPosting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: o.title,
    description: o.html,
    datePosted: o.date,
    validThrough: o.vence || undefined,
    employmentType: tipoEmpleo,
    totalJobOpenings: o.vacantes ?? undefined,
    jobLocationType: o.modalidad === "remoto" ? "TELECOMMUTE" : undefined,
    baseSalary: o.sueldoMin
      ? { "@type": "MonetaryAmount", currency: "PEN", value: { "@type": "QuantitativeValue", value: o.sueldoMin, unitText: "MONTH" } }
      : undefined,
    hiringOrganization: { "@type": "Organization", name: o.empresa },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: prov?.nombre, addressRegion: "Ica", addressCountry: "PE" },
    },
  };

  // Ofertas parecidas: de la misma categoría (las más recientes)
  const parecidas = esEjemplo ? [] : getOfertas()
    .filter((x) => x.slug !== o.slug && x.categoria === o.categoria)
    .slice(0, 3)
    .map(({ html: _html, ...resto }) => resto);

  const datos: { icono: NombreIcono; etiqueta: string; valor?: string | number | null; clase?: string }[] = [
    { icono: "billete", etiqueta: "Sueldo", valor: o.sueldo, clase: "dato-sueldo" },
    { icono: "pin", etiqueta: "Lugar", valor: `${o.distrito && o.distrito !== prov?.nombre ? `${o.distrito}, ` : ""}${prov?.nombre ?? ""}` },
    { icono: "edificio", etiqueta: "Modalidad", valor: nombre(modalidades, o.modalidad) },
    { icono: "reloj", etiqueta: "Jornada", valor: nombre(jornadas, o.jornada) },
    { icono: "medalla", etiqueta: "Experiencia", valor: nombre(experiencias, o.experiencia) },
    { icono: "birrete", etiqueta: "Estudios", valor: nombre(educaciones, o.educacion) },
    { icono: "personas", etiqueta: "Vacantes", valor: o.vacantes },
    { icono: "calendario", etiqueta: "Postula hasta", valor: o.vence ? formatFecha(o.vence) : "Sin fecha límite" },
  ];

  return (
    <div className="pagina">
      {!esEjemplo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      )}
      <div className="contenedor contenedor-ancho">
        <Cabecera migas={[{ href: "/empleos/", texto: "Empleos" }, { href: `/empleos/${o.categoria}/`, texto: cat?.nombre ?? "" }, { texto: o.title }]} />
        {esEjemplo && (
          <p className="vacio" style={{ marginBottom: 16 }}>
            👀 Vista de ejemplo: así se verá una oferta. Se genera desde <code>content/_plantilla-oferta.md</code> y no
            aparece en los listados ni en Google.
          </p>
        )}

        <div className="layout layout-der">
          <article className="principal panel panel-articulo">
            <div className="oc-top"><EstadoBadge vence={o.vence} fecha={o.date} /></div>
            <div className="oferta-cab">
              <LogoEmpresa empresa={o.empresa} grande />
              <div>
                <h1 className="articulo-titulo">{o.title}</h1>
                <p className="oc-empresa">{o.empresa}</p>
              </div>
            </div>
            <p className="oferta-etiquetas">
              <Link href={`/empleos/${o.categoria}/`} className="atajo">{cat?.icono} {cat?.nombre}</Link>
              <Link href={`/provincia/${o.provincia}/`} className="atajo">📍 {prov?.nombre}</Link>
              <span className="oc-fecha">Publicado el {formatFecha(o.date)}</span>
            </p>
            <Anuncio />
            <div className="prosa" dangerouslySetInnerHTML={{ __html: o.html }} />
            <p className="aviso">
              Chamba en Ica no participa en el proceso de selección y nunca cobra por postular. Verifica siempre los datos
              en la fuente oficial.
            </p>
          </article>

          <aside className="lateral lateral-pegado">
            <div className="panel">
              <p className="panel-titulo">Resumen de la oferta</p>
              <dl className="datos-oferta">
                {datos.filter((d) => d.valor).map((d) => (
                  <div key={d.etiqueta} className={d.clase}>
                    <dt><Icono nombre={d.icono} /> {d.etiqueta}</dt>
                    <dd>{d.valor}</dd>
                  </div>
                ))}
              </dl>
              <div className="acciones-oferta">
                {o.fuente && (
                  <a href={o.fuente} className="btn btn-naranja" target="_blank" rel="noopener noreferrer">
                    Ver convocatoria oficial <Icono nombre="enlace" tam={16} />
                  </a>
                )}
                <GuardarOferta slug={o.slug} />
              </div>
            </div>
            <Link href="/guias/como-detectar-ofertas-de-trabajo-falsas/" className="panel panel-alerta">
              <Icono nombre="escudo" tam={22} />
              <span><strong>Nunca pagues por postular.</strong> Aprende a reconocer una oferta falsa.</span>
            </Link>
          </aside>
        </div>

        {parecidas.length > 0 && (
          <section className="seguir-leyendo">
            <h2>Ofertas parecidas</h2>
            <ListaTarjetas ofertas={parecidas} />
            <p><Link href={`/empleos/${o.categoria}/`} className="enlace-flecha">Ver más en {cat?.nombre} <Icono nombre="derecha" tam={16} /></Link></p>
          </section>
        )}
      </div>
    </div>
  );
}
