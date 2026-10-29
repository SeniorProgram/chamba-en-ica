import type { Metadata } from "next";
import Link from "next/link";
import { getGuias } from "@/lib/content";
import Cabecera from "@/components/Cabecera";
import { GuiaFila, gruposGuias } from "@/components/Tarjetas";
import { Icono } from "@/components/OfertaCard";

export const metadata: Metadata = {
  title: "Centro de información",
  description: "Guías sobre CTS, gratificación, sueldo mínimo, CV, convocatorias CAS y cómo evitar estafas de empleo.",
};

export default function Guias() {
  const guias = getGuias();
  const grupos = gruposGuias.map((g) => ({ ...g, lista: guias.filter((x) => x.grupo === g.id) })).filter((g) => g.lista.length);

  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera
          migas={[{ texto: "Información" }]}
          titulo="Centro de información"
          descripcion="Guías claras sobre tus beneficios laborales y cómo conseguir trabajo, actualizadas a 2026."
        />

        <div className="layout layout-izq">
          <aside className="lateral">
            <nav className="panel" aria-label="Temas">
              <p className="panel-titulo">Temas</p>
              <ul className="lista-enlaces">
                {grupos.map((g) => (
                  <li key={g.id}>
                    <a href={`#${g.id}`}><span aria-hidden>{g.icono}</span> {g.titulo} <small>{g.lista.length}</small></a>
                  </li>
                ))}
              </ul>
            </nav>
            <Link href="/empleos/" className="panel-publica">
              <strong>¿Ya estás listo para postular?</strong>
              <span>Mira las ofertas vigentes en las cinco provincias de Ica.</span>
            </Link>
            <p className="panel nota-legal">
              <Icono nombre="escudo" /> La información es referencial y no reemplaza la asesoría de un abogado o contador.
            </p>
          </aside>

          <div className="principal">
            <p className="resultados-cab"><span><strong>{guias.length}</strong> guías para ti</span></p>
            {grupos.map((g) => (
              <section key={g.id} id={g.id} className="grupo-guias">
                <h2><span aria-hidden>{g.icono}</span> {g.titulo}</h2>
                <div className="lista-ofertas">
                  {g.lista.map((guia) => <GuiaFila key={guia.slug} guia={guia} />)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
