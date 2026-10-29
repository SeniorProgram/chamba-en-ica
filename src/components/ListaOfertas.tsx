import Link from "next/link";
import { Suspense } from "react";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import { aGuiaBusqueda, aOfertaBusqueda } from "@/lib/busqueda";
import BuscadorEmpleos from "./BuscadorEmpleos";
import Anuncio from "./Anuncio";

type Props = {
  titulo: string;
  descripcion: string;
  /** Página de una categoría o provincia: ese filtro queda fijo */
  fijo?: { cat?: string; prov?: string };
  /** En /buscar/ también se muestran las guías que coinciden con la palabra */
  conGuias?: boolean;
};

/** Listado de ofertas con buscador y filtros (categoría, provincia, jornada, sueldo, fecha...). */
export default function ListaOfertas({ titulo, descripcion, fijo, conGuias }: Props) {
  // Índice de búsqueda generado al compilar: no necesita servidor ni base de datos
  const ofertas = getOfertas().map(aOfertaBusqueda);
  const guias = conGuias ? getGuias().map(aGuiaBusqueda) : [];
  const activo = fijo?.cat ?? fijo?.prov;

  return (
    <div className="contenedor">
      <header className="cabecera-pagina centro">
        <div className="migas entrada">
          <Link href="/">Inicio</Link> › <Link href="/empleos/">Empleos</Link>
        </div>
        <h1 className="entrada entrada-2">{titulo}</h1>
        <p className="muted entrada entrada-3">{descripcion}</p>
      </header>

      {/* Accesos rápidos (también ayudan a Google a encontrar cada sección) */}
      <nav className="filtros entrada entrada-3" aria-label="Categorías">
        <Link href="/empleos/" className={!activo ? "filtro activo" : "filtro"}>Todas</Link>
        {categorias.map((c) => (
          <Link key={c.slug} href={`/empleos/${c.slug}/`} className={activo === c.slug ? "filtro activo" : "filtro"}>
            {c.icono} {c.nombre}
          </Link>
        ))}
      </nav>
      <nav className="filtros entrada entrada-4" aria-label="Provincias">
        {provincias.map((p) => (
          <Link key={p.slug} href={`/provincia/${p.slug}/`} className={activo === p.slug ? "filtro activo" : "filtro"}>
            📍 {p.nombre}
          </Link>
        ))}
      </nav>

      <Anuncio />

      <div style={{ paddingBottom: 72 }}>
        <Suspense>
          <BuscadorEmpleos ofertas={ofertas} guias={guias} fijo={fijo} />
        </Suspense>
      </div>
    </div>
  );
}
