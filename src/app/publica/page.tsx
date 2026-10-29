import type { Metadata } from "next";
import FormularioOferta from "./FormularioOferta";
import Cabecera from "@/components/Cabecera";
import { Icono } from "@/components/OfertaCard";

export const metadata: Metadata = {
  title: "Publica tu oferta de trabajo gratis",
  description: "¿Tu empresa contrata en Ica, Chincha, Pisco, Nasca o Palpa? Publica tu oferta de empleo gratis en Chamba en Ica.",
};

export default function Publica() {
  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera
          migas={[{ texto: "Publica tu oferta" }]}
          titulo="Publica tu oferta gratis"
          descripcion="Llega a personas que buscan trabajo en las cinco provincias de Ica."
        />
        <div className="layout layout-der">
          <div className="principal">
            <FormularioOferta />
          </div>
          <aside className="lateral lateral-pegado">
            <div className="panel">
              <p className="panel-titulo">¿Cómo funciona?</p>
              <ol className="pasos">
                <li><strong>Llenas el formulario</strong><span>Con los datos del puesto y cómo postular.</span></li>
                <li><strong>Lo revisamos</strong><span>Normalmente en 1 o 2 días.</span></li>
                <li><strong>Lo publicamos</strong><span>Aparece en el buscador y en Google.</span></li>
              </ol>
            </div>
            <div className="panel">
              <p className="panel-titulo">Siempre gratis</p>
              <ul className="lista-check">
                <li><Icono nombre="check" /> Sin costo para la empresa</li>
                <li><Icono nombre="check" /> Sin costo para quien postula</li>
                <li><Icono nombre="check" /> Solo ofertas en la región Ica</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
