import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categorias, educaciones, experiencias, jornadas, modalidades, provincias } from "@/site.config";
import { formatFecha, getOferta, getOfertaEjemplo, getOfertas } from "@/lib/content";
import Anuncio from "@/components/Anuncio";
import Cabecera from "@/components/Cabecera";
import { EstadoBadge, GuardarOferta, Icono, ListaTarjetas, LogoEmpresa, type NombreIcono } from "@/components/OfertaCard";
import { AccionesOferta, PestanasOferta } from "@/components/AccionesOferta";

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

  // Empleos relacionados: primero los de la misma categoría, luego los de la misma provincia
  const otras = esEjemplo ? [] : getOfertas().filter((x) => x.slug !== o.slug);
  const relacionadas = [
    ...otras.filter((x) => x.categoria === o.categoria),
    ...otras.filter((x) => x.categoria !== o.categoria && x.provincia === o.provincia),
  ].slice(0, 6).map(({ html: _html, ...resto }) => resto);

  const lugar = `${o.distrito && o.distrito !== prov?.nombre ? `${o.distrito}, ` : ""}${prov?.nombre ?? ""}, Ica`;
  const modalidad = nombre(modalidades, o.modalidad);
  const dominio = (() => { try { return new URL(o.fuente).hostname.replace(/^www\./, ""); } catch { return ""; } })();

  // Ruta de migas: cada paso lleva a la búsqueda con ese filtro
  const migas = [
    { href: "/empleos/", texto: "Empleos" },
    { href: `/empleos/${o.categoria}/`, texto: cat?.nombre ?? "" },
    { href: `/provincia/${o.provincia}/`, texto: prov?.nombre ?? "" },
    ...(modalidad ? [{ href: `/empleos/?mod=${o.modalidad}`, texto: modalidad }] : []),
    { texto: o.title },
  ];

  const esenciales: { icono: NombreIcono; etiqueta: string; valor?: string | number | null }[] = [
    { icono: "reloj", etiqueta: "Jornada", valor: nombre(jornadas, o.jornada) },
    { icono: "edificio", etiqueta: "Modalidad", valor: modalidad },
    { icono: "medalla", etiqueta: "Experiencia", valor: nombre(experiencias, o.experiencia) },
    { icono: "birrete", etiqueta: "Estudios", valor: nombre(educaciones, o.educacion) },
    { icono: "personas", etiqueta: "Vacantes", valor: o.vacantes },
    { icono: "calendario", etiqueta: "Postula hasta", valor: o.vence ? formatFecha(o.vence) : "Sin fecha límite" },
  ];

  const detalle = (
    <article className="panel panel-articulo detalle-oferta">
      <div className="oc-top">
        <EstadoBadge vence={o.vence} fecha={o.date} />
        {o.vacantes && o.vacantes > 1 ? <span className="oc-chip"><Icono nombre="personas" /> Múltiples vacantes</span> : null}
      </div>
      <p className="detalle-lugar"><Icono nombre="pin" /> {lugar}</p>

      <dl className="esenciales">
        {esenciales.filter((d) => d.valor).map((d) => (
          <div key={d.etiqueta}>
            <dt><Icono nombre={d.icono} /> {d.etiqueta}</dt>
            <dd>{d.valor}</dd>
          </div>
        ))}
      </dl>

      <Anuncio />
      <h2 className="detalle-titulo"><Icono nombre="documento" tam={22} /> Descripción del puesto</h2>
      {/* Las ofertas importadas ya empiezan con "## Descripción del puesto": se quita para no repetir el título */}
      <div className="prosa" dangerouslySetInnerHTML={{ __html: o.html.replace(/^\s*<h2[^>]*>\s*Descripción del puesto\s*<\/h2>/i, "") }} />
    </article>
  );

  const listaRelacionadas = relacionadas.length ? (
    <>
      <ListaTarjetas ofertas={relacionadas} />
      <p className="centro" style={{ marginTop: 20 }}>
        <Link href={`/empleos/${o.categoria}/`} className="enlace-flecha">Ver más en {cat?.nombre} <Icono nombre="derecha" tam={16} /></Link>
      </p>
    </>
  ) : (
    <p className="vacio">Por ahora no hay otras ofertas parecidas. <Link href="/empleos/">Ver todas las ofertas</Link></p>
  );

  return (
    <div className="pagina pagina-oferta">
      {!esEjemplo && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPosting) }} />
      )}
      <div className="contenedor contenedor-ancho">
        <Cabecera migas={migas} />
        {esEjemplo && (
          <p className="vacio" style={{ marginBottom: 16 }}>
            👀 Vista de ejemplo: así se verá una oferta. Se genera desde <code>content/_plantilla-oferta.md</code> y no
            aparece en los listados ni en Google.
          </p>
        )}

        <header className="panel oferta-encabezado entrada">
          <LogoEmpresa empresa={o.empresa} logo={o.logo} grande />
          <div className="oferta-encabezado-texto">
            <h1>{o.title}</h1>
            <p>
              <span className="oc-empresa">{o.empresa}</span>
              <span className="separador" aria-hidden>|</span>
              <Link href={`/empleos/${o.categoria}/`}>{cat?.icono} {cat?.nombre}</Link>
            </p>
          </div>
          <AccionesOferta slug={o.slug} titulo={o.title} />
        </header>

        <div className="layout layout-der">
          <div className="principal">
            <PestanasOferta detalle={detalle} relacionadas={listaRelacionadas} total={relacionadas.length} />
          </div>

          <aside className="lateral lateral-pegado">
            <div className="panel panel-postular" id="postular">
              <p className="postular-etiqueta">Sueldo mensual</p>
              <p className="postular-sueldo">{o.sueldo}</p>
              <ul className="postular-datos">
                <li><Icono nombre="calendario" /> {o.vence ? <>Postula hasta el <strong>{formatFecha(o.vence)}</strong></> : "Sin fecha límite"}</li>
                {o.vacantes ? <li><Icono nombre="personas" /> {o.vacantes} {o.vacantes === 1 ? "vacante" : "vacantes"}</li> : null}
              </ul>
              {o.fuente ? (
                <a href={o.fuente} className="btn btn-naranja btn-postular" target="_blank" rel="noopener noreferrer">
                  Postular en la web oficial <Icono nombre="enlace" tam={16} />
                </a>
              ) : (
                <a href="#panel-detalle" className="btn btn-naranja btn-postular">Ver cómo postular</a>
              )}
              <GuardarOferta slug={o.slug} />
              {o.origen.startsWith("Empleos Perú") ? (
                // El servidor de inicio de sesión del Ministerio falla a ratos (502) y la página sale en blanco; recargar lo arregla
                <p className="postular-nota">
                  Te llevamos a <strong>Empleos Perú</strong>: para aplicar necesitas una cuenta gratuita. Si la página sale en
                  blanco, es una falla momentánea del portal: <strong>recárgala</strong> (F5, o desliza hacia abajo en el celular)
                  una o dos veces y la oferta aparece.
                </p>
              ) : (
                <p className="postular-nota">
                  Te llevamos a {dominio ? <strong>{dominio}</strong> : "la fuente oficial"}. Revisa ahí las bases y el cronograma completos.
                </p>
              )}
            </div>

            <p className="nota-seguridad">
              <Icono nombre="escudo" /> <span>
                Los requisitos y el proceso los define {o.empresa}. <strong>Nunca envíes dinero ni hagas pagos</strong> para
                postular: ningún reclutador serio te lo pedirá. ¿Te llegó otro aviso por WhatsApp? <Link href="/verificar/">Verifícalo aquí</Link>
              </span>
            </p>

            <div className="panel panel-entidad">
              <dl>
                <div><dt>Entidad</dt><dd>{o.empresa}</dd></div>
                <div><dt>Sector</dt><dd>{o.categoria === "convocatorias-del-estado" ? "Público" : "Privado"}</dd></div>
                <div><dt>Ubicación</dt><dd>{lugar}</dd></div>
                <div><dt>Publicado</dt><dd>{formatFecha(o.date)}</dd></div>
                {(o.origen || dominio) && <div><dt>Fuente</dt><dd>{o.origen || dominio}</dd></div>}
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {/* En el celular, el sueldo y el botón de postular quedan siempre a la mano */}
      <div className="barra-postular">
        <div>
          <small>Sueldo</small>
          <strong>{o.sueldo}</strong>
        </div>
        <a href="#postular" className="btn btn-naranja">Postular</a>
      </div>
    </div>
  );
}
