import Link from "next/link";
import { formatFecha, type Guia, type GuiaGrupo } from "@/lib/content";

export const gruposGuias: { id: GuiaGrupo; titulo: string; corto: string; icono: string }[] = [
  { id: "beneficios", titulo: "Tus beneficios y tu sueldo", corto: "Beneficios", icono: "💰" },
  { id: "postula", titulo: "Postula con ventaja", corto: "Postula", icono: "📄" },
  { id: "cuidate", titulo: "Cuídate", corto: "Cuídate", icono: "🛡️" },
];

const grupoDe = (g: GuiaGrupo) => gruposGuias.find((x) => x.id === g);

/** Portada de una guía (si no tiene imagen, un fondo con el ícono de su grupo) */
function Portada({ guia, className }: { guia: Guia; className: string }) {
  return guia.imagen ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={guia.imagen} alt="" loading="lazy" decoding="async" width={1200} height={630} />
  ) : (
    <span className={`${className} portada-vacia`} aria-hidden>{grupoDe(guia.grupo)?.icono}</span>
  );
}

/** Guía en grilla: imagen arriba */
export function TarjetaGuia({ guia, i = 0 }: { guia: Guia; i?: number }) {
  return (
    <Link href={`/guias/${guia.slug}/`} className="guia-tarjeta revelar" style={{ "--retraso": `${i * 80}ms` } as React.CSSProperties}>
      <Portada guia={guia} className="guia-img" />
      <span className="guia-cuerpo">
        <span className="badge">{grupoDe(guia.grupo)?.corto ?? "Guía"}</span>
        <h3>{guia.title}</h3>
        <p>{guia.description}</p>
      </span>
    </Link>
  );
}

/** Guía en lista: imagen a la izquierda (como las ofertas) */
export function GuiaFila({ guia }: { guia: Guia }) {
  return (
    <article className="guia-fila">
      <Portada guia={guia} className="guia-img" />
      <div className="guia-cuerpo">
        <div className="oc-top">
          <span className="badge">{grupoDe(guia.grupo)?.corto ?? "Guía"}</span>
          <span className="oc-fecha">Actualizado el {formatFecha(guia.updated)}</span>
        </div>
        <h3><Link href={`/guias/${guia.slug}/`} className="oc-enlace">{guia.title}</Link></h3>
        <p>{guia.description}</p>
        <span className="guia-leer">Leer la guía →</span>
      </div>
    </article>
  );
}

/** Guía en una columna lateral: miniatura + título */
export function GuiaMini({ guia }: { guia: Guia }) {
  return (
    <Link href={`/guias/${guia.slug}/`} className="guia-mini">
      <Portada guia={guia} className="guia-mini-img" />
      <span>{guia.title}</span>
    </Link>
  );
}
