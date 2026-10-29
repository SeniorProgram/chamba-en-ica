import type { Metadata } from "next";
import Link from "next/link";
import FormularioOferta from "./FormularioOferta";

export const metadata: Metadata = {
  title: "Publica tu oferta de trabajo gratis",
  description: "¿Tu empresa contrata en Ica, Chincha, Pisco, Nasca o Palpa? Publica tu oferta de empleo gratis en Chamba en Ica.",
};

export default function Publica() {
  return (
    <article className="contenedor angosto">
      <header className="cabecera-pagina">
        <div className="migas entrada">
          <Link href="/">Inicio</Link> › Publica tu oferta
        </div>
        <h1 className="entrada entrada-2">Publica tu oferta gratis</h1>
        <p className="muted entrada entrada-3">
          Llega a personas que buscan trabajo en las cinco provincias de Ica. Llena el formulario y revisamos tu oferta
          antes de publicarla, normalmente en 1 o 2 días.
        </p>
      </header>
      <FormularioOferta />
    </article>
  );
}
