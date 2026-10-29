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
  const cat = categorias.find((c) => c.slug === fijo?.cat);
  const prov = provincias.find((p) => p.slug === fijo?.prov);

  return (
    <div className="pagina-empleos">
      <div className="contenedor contenedor-ancho">
        <header className="empleos-cab">
          <nav className="migas entrada" aria-label="Ruta">
            <Link href="/">Inicio</Link> <span aria-hidden>›</span> <Link href="/empleos/">Empleos</Link>
            {(cat || prov) && <> <span aria-hidden>›</span> <span>{cat?.nombre ?? prov?.nombre}</span></>}
          </nav>
          <h1 className="entrada entrada-2">{titulo}</h1>
          <p className="muted entrada entrada-2">{descripcion}</p>
        </header>

        {/* Accesos rápidos (también ayudan a Google a encontrar cada sección) */}
        <nav className="atajos entrada entrada-3" aria-label="Categorías y provincias">
          <Link href="/empleos/" className={!activo ? "atajo activo" : "atajo"}>Todas</Link>
          {categorias.map((c) => (
            <Link key={c.slug} href={`/empleos/${c.slug}/`} className={activo === c.slug ? "atajo activo" : "atajo"}>
              <span aria-hidden>{c.icono}</span> {c.nombre}
            </Link>
          ))}
          <span className="atajos-separador" aria-hidden />
          {provincias.map((p) => (
            <Link key={p.slug} href={`/provincia/${p.slug}/`} className={activo === p.slug ? "atajo activo" : "atajo"}>
              {p.nombre}
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
    </div>
  );
}
