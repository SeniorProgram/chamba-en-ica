import type { Metadata } from "next";
import { Suspense } from "react";
import Cabecera from "@/components/Cabecera";
import AccionEnlace from "../AccionEnlace";

export const metadata: Metadata = { title: "Confirmar alerta de empleo", robots: { index: false, follow: false } };

export default function Confirmar() {
  return (
    <div className="pagina">
      <div className="contenedor">
        <Cabecera migas={[{ href: "/alertas/", texto: "Alertas de empleo" }, { texto: "Confirmar" }]} />
        <div style={{ paddingBottom: 72 }}>
          <Suspense>
            <AccionEnlace accion="confirmar" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
