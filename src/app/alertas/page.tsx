import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Cabecera from "@/components/Cabecera";
import { Icono } from "@/components/OfertaCard";
import { alertasActivas } from "@/lib/alertas";
import FormularioAlertas from "./FormularioAlertas";

export const metadata: Metadata = {
  title: "Alertas de empleo por correo",
  description: "Recibe en tu correo las ofertas de trabajo nuevas de Ica, Chincha, Pisco, Nasca y Palpa: elige el tipo de trabajo y la provincia. Gratis.",
};

export default function Alertas() {
  // Se decide al compilar: si faltan las claves en Vercel, la página avisa que pronto estará lista
  const activas = alertasActivas();
  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera
          migas={[{ texto: "Alertas de empleo" }]}
          titulo="Recibe las ofertas nuevas en tu correo"
          descripcion="Elige qué trabajo buscas y dónde. Cada día que haya ofertas nuevas que coincidan, te llega un correo. Gratis."
        />
        <div className="layout layout-der">
          <div className="principal">
            {activas ? (
              <Suspense>
                <FormularioAlertas />
              </Suspense>
            ) : (
              <div className="vacio" style={{ marginBottom: 72 }}>
                <p><strong>Las alertas por correo llegan muy pronto.</strong></p>
                <p>Mientras tanto, revisa las <Link href="/empleos/">ofertas de hoy</Link> y guarda las que te interesen con el corazón.</p>
              </div>
            )}
          </div>
          <aside className="lateral lateral-pegado">
            <div className="panel">
              <p className="panel-titulo">¿Cómo funciona?</p>
              <ol className="pasos">
                <li><strong>Elige</strong><span>El tipo de trabajo y las provincias que te interesan.</span></li>
                <li><strong>Confirma tu correo</strong><span>Te mandamos un enlace para activar la alerta.</span></li>
                <li><strong>Recibe las ofertas</strong><span>Solo cuando hay nuevas, máximo un correo al día.</span></li>
              </ol>
            </div>
            <Link href="/guias/como-detectar-ofertas-de-trabajo-falsas/" className="panel panel-alerta">
              <Icono nombre="escudo" tam={22} />
              <span><strong>Nunca te pediremos dinero</strong> ni datos como tu DNI o claves por correo.</span>
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
