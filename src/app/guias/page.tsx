import type { Metadata } from "next";
import { getGuias, type GuiaGrupo } from "@/lib/content";
import { TarjetaGuia } from "@/components/Tarjetas";

export const metadata: Metadata = {
  title: "Centro de información",
  description: "Guías sobre CTS, gratificación, sueldo mínimo, CV, convocatorias CAS y cómo evitar estafas de empleo.",
};

const grupos: { id: GuiaGrupo; titulo: string }[] = [
  { id: "beneficios", titulo: "💰 Tus beneficios y tu sueldo" },
  { id: "postula", titulo: "📄 Postula con ventaja" },
  { id: "cuidate", titulo: "🛡️ Cuídate" },
];

export default function Guias() {
  const guias = getGuias();
  return (
    <div className="contenedor">
      <header className="cabecera-pagina centro">
        <h1 className="entrada">Centro de información</h1>
        <p className="muted entrada entrada-2">
          Guías claras sobre tus beneficios laborales y cómo conseguir trabajo, actualizadas a 2026.
        </p>
      </header>
      {grupos.map((g) => {
        const lista = guias.filter((x) => x.grupo === g.id);
        if (!lista.length) return null;
        return (
          <section key={g.id} className="seccion" style={{ paddingTop: 32, paddingBottom: 16 }}>
            <h2 className="revelar">{g.titulo}</h2>
            <div className="grilla" style={{ marginTop: 16 }}>
              {lista.map((guia, i) => (
                <TarjetaGuia key={guia.slug} guia={guia} i={i} />
              ))}
            </div>
          </section>
        );
      })}
      <p className="aviso" style={{ marginBottom: 64 }}>
        La información es referencial y no reemplaza la asesoría de un abogado o contador.
      </p>
    </div>
  );
}
