import type { Metadata } from "next";
import { Suspense } from "react";
import Cabecera from "@/components/Cabecera";
import AccionEnlace from "../AccionEnlace";

export const metadata: Metadata = { title: "Dejar de recibir alertas", robots: { index: false, follow: false } };

export default function Baja() {
  return (
    <div className="pagina">
      <div className="contenedor">
        <Cabecera migas={[{ href: "/alertas/", texto: "Alertas de empleo" }, { texto: "Darse de baja" }]} />
        <div style={{ paddingBottom: 72 }}>
          <Suspense>
            <AccionEnlace accion="baja" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
