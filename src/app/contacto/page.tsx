import type { Metadata } from "next";
import { getPagina } from "@/lib/content";
import { site } from "@/site.config";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Publica una oferta de trabajo en Ica, reporta un error o envíanos una sugerencia.",
};

const motivos = [
  { asunto: "Quiero publicar una oferta", icono: "📢" },
  { asunto: "Reportar un error o una oferta vencida", icono: "⚠️" },
  { asunto: "Sugerencia", icono: "💡" },
];

export default function Contacto() {
  const p = getPagina("contacto");
  return (
    <article className="contenedor angosto">
      <header className="cabecera-pagina">
        <h1 className="entrada">Contacto</h1>
      </header>
      {p && <div className="prosa entrada entrada-2" style={{ paddingBottom: 0 }} dangerouslySetInnerHTML={{ __html: p.html }} />}
      <div className="grilla" style={{ marginBottom: 72 }}>
        {motivos.map((m, i) => (
          <a
            key={m.asunto}
            className="tarjeta revelar"
            style={{ "--retraso": `${i * 80}ms` } as React.CSSProperties}
            href={`mailto:${site.contactEmail}?subject=${encodeURIComponent(`${m.asunto} – Chamba en Ica`)}`}
          >
            <div className="icono">{m.icono}</div>
            <h3>{m.asunto}</h3>
            <p>Escríbenos a {site.contactEmail}</p>
          </a>
        ))}
      </div>
    </article>
  );
}
