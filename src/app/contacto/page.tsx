import type { Metadata } from "next";
import Link from "next/link";
import { getPagina } from "@/lib/content";
import { site } from "@/site.config";
import Cabecera from "@/components/Cabecera";
import { Icono } from "@/components/OfertaCard";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Publica una oferta de trabajo en Ica, reporta un error o envíanos una sugerencia.",
};

const motivos = [
  { asunto: "Reportar un error o una oferta vencida", icono: "⚠️" },
  { asunto: "Sugerencia", icono: "💡" },
];

export default function Contacto() {
  const p = getPagina("contacto");
  return (
    <div className="pagina">
      <div className="contenedor angosto">
        <Cabecera migas={[{ texto: "Contacto" }]} titulo="Contacto" descripcion="¿Tienes una oferta, encontraste un error o quieres sugerirnos algo? Escríbenos." />
        <div className="grilla grilla-contacto">
          <Link href="/publica/" className="tarjeta revelar">
            <div className="icono">📢</div>
            <h3>Quiero publicar una oferta</h3>
            <p>Llena el formulario: es gratis</p>
          </Link>
          {motivos.map((m, i) => (
            <a
              key={m.asunto}
              className="tarjeta revelar"
              style={{ "--retraso": `${(i + 1) * 80}ms` } as React.CSSProperties}
              href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`${m.asunto} – Chamba en Ica`)}`}
            >
              <div className="icono">{m.icono}</div>
              <h3>{m.asunto}</h3>
              <p>Escríbenos a {site.contactEmail}</p>
            </a>
          ))}
        </div>
        {p && <article className="panel panel-articulo prosa" dangerouslySetInnerHTML={{ __html: p.html }} />}
        <p className="panel nota-legal" style={{ marginBottom: 72 }}>
          <Icono nombre="correo" /> Respondemos en 1 o 2 días hábiles a <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>.
        </p>
      </div>
    </div>
  );
}
