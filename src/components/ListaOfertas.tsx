import Link from "next/link";
import { categorias, provincias } from "@/site.config";
import type { Oferta } from "@/lib/content";
import { TarjetaOferta } from "./Tarjetas";
import Anuncio from "./Anuncio";

type Props = {
  titulo: string;
  descripcion: string;
  ofertas: Oferta[];
  activo?: string;
};

/** Listado de ofertas con filtros por categoría y provincia. */
export default function ListaOfertas({ titulo, descripcion, ofertas, activo }: Props) {
  return (
    <div className="contenedor">
      <header className="cabecera-pagina centro">
        <div className="migas entrada">
          <Link href="/">Inicio</Link> › <Link href="/empleos/">Empleos</Link>
        </div>
        <h1 className="entrada entrada-2">{titulo}</h1>
        <p className="muted entrada entrada-3">{descripcion}</p>
      </header>

      <nav className="filtros entrada entrada-3" aria-label="Filtrar ofertas">
        <Link href="/empleos/" className={!activo ? "filtro activo" : "filtro"}>Todas</Link>
        {categorias.map((c) => (
          <Link key={c.slug} href={`/empleos/${c.slug}/`} className={activo === c.slug ? "filtro activo" : "filtro"}>
            {c.icono} {c.nombre}
          </Link>
        ))}
      </nav>
      <nav className="filtros entrada entrada-4" aria-label="Filtrar por provincia">
        {provincias.map((p) => (
          <Link key={p.slug} href={`/provincia/${p.slug}/`} className={activo === p.slug ? "filtro activo" : "filtro"}>
            📍 {p.nombre}
          </Link>
        ))}
      </nav>

      <Anuncio />

      <section style={{ paddingBottom: 72 }}>
        {ofertas.length ? (
          <div className="grilla">
            {ofertas.map((o, i) => (
              <TarjetaOferta key={o.slug} oferta={o} i={i} />
            ))}
          </div>
        ) : (
          <div className="vacio revelar" style={{ marginTop: 32 }}>
            <p>Todavía no hay ofertas publicadas en esta sección.</p>
            <p>
              Mientras tanto, revisa nuestras <Link href="/guias/">guías para postular</Link>.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
