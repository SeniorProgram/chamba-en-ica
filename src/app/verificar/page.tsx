import type { Metadata } from "next";
import Link from "next/link";
import Cabecera from "@/components/Cabecera";
import { Icono } from "@/components/OfertaCard";
import VerificadorAviso from "./VerificadorAviso";

export const metadata: Metadata = {
  title: "Verifica si una oferta de trabajo es falsa",
  description: "Pega el aviso de trabajo que te llegó por WhatsApp o Facebook y revisa si tiene señales de estafa antes de enviar tus datos o tu dinero.",
};

export default function Verificar() {
  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera
          migas={[{ texto: "Verificar un aviso" }]}
          titulo="¿Esta oferta de trabajo es real?"
          descripcion="Pega el aviso que te llegó y te decimos si tiene señales de estafa antes de que envíes tus datos o tu dinero."
        />
        <div className="layout layout-der">
          <div className="principal">
            <VerificadorAviso />
          </div>
          <aside className="lateral lateral-pegado">
            <div className="panel">
              <p className="panel-titulo">¿Cómo funciona?</p>
              <ol className="pasos">
                <li><strong>Pega el aviso</strong><span>Tal como te llegó, con todo el texto.</span></li>
                <li><strong>Lo revisamos</strong><span>Buscamos las señales típicas de estafa laboral.</span></li>
                <li><strong>Decides con calma</strong><span>Te decimos qué verificar antes de postular.</span></li>
              </ol>
            </div>
            <Link href="/guias/como-detectar-ofertas-de-trabajo-falsas/" className="panel panel-alerta">
              <Icono nombre="escudo" tam={22} />
              <span><strong>Regla de oro:</strong> si te piden dinero para darte un trabajo, es estafa.</span>
            </Link>
            <Link href="/empleos/" className="panel-publica">
              <strong>Busca ofertas verificadas</strong>
              <span>Todas las ofertas de Chamba en Ica indican su fuente oficial.</span>
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
