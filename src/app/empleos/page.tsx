import type { Metadata } from "next";
import ListaOfertas from "@/components/ListaOfertas";

export const metadata: Metadata = {
  title: "Ofertas de empleo en Ica",
  description: "Convocatorias del Estado, empleos en empresas, agroexportación, prácticas y part time en la región Ica.",
};

export default function Empleos() {
  return (
    <ListaOfertas
      titulo="Ofertas de empleo en Ica"
      descripcion="Busca por puesto y filtra por provincia, jornada, sueldo, experiencia y más."
    />
  );
}
