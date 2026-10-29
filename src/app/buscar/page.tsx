import type { Metadata } from "next";
import ListaOfertas from "@/components/ListaOfertas";

export const metadata: Metadata = {
  title: "Buscar empleos",
  robots: { index: false },
};

export default function BuscarPage() {
  return (
    <ListaOfertas
      titulo="Buscar empleos en Ica"
      descripcion="Escribe un puesto o empresa y afina con los filtros. También te mostramos guías relacionadas."
      conGuias
    />
  );
}
