import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import { aGuiaBusqueda, aOfertaBusqueda } from "@/lib/busqueda";
import BuscadorEmpleos from "./BuscadorEmpleos";
import Anuncio from "./Anuncio";
import Cabecera from "./Cabecera";
import { Icono } from "./OfertaCard";
import { alertasActivas } from "@/lib/alertas";

type Props = {
  titulo: string;
  descripcion: string;
  /** Página de una categoría o provincia: ese filtro queda fijo */
  fijo?: { cat?: string; prov?: string };
  /** En /buscar/ también se muestran las guías que coinciden con la palabra */
  conGuias?: boolean;
  /** Texto propio de la página, debajo de los resultados */
  pie?: ReactNode;
};

/** Listado de ofertas con buscador y filtros (categoría, provincia, jornada, sueldo, fecha...). */
export default function ListaOfertas({ titulo, descripcion, fijo, conGuias, pie }: Props) {
  // Índice de búsqueda generado al compilar: no necesita servidor ni base de datos
  const ofertas = getOfertas().map(aOfertaBusqueda);
  const guias = conGuias ? getGuias().map(aGuiaBusqueda) : [];
  const cat = categorias.find((c) => c.slug === fijo?.cat);
  const prov = provincias.find((p) => p.slug === fijo?.prov);
  // Los atajos mantienen el otro filtro fijo: en "Prácticas", Chincha lleva a /empleos/practicas/chincha/
  const hrefCat = (c?: string) => (c ? (prov ? `/empleos/${c}/${prov.slug}/` : `/empleos/${c}/`) : prov ? `/provincia/${prov.slug}/` : "/empleos/");
  const hrefProv = (p?: string) => (p ? (cat ? `/empleos/${cat.slug}/${p}/` : `/provincia/${p}/`) : cat ? `/empleos/${cat.slug}/` : "/empleos/");
  const migas = cat && prov
    ? [{ href: "/empleos/", texto: "Empleos" }, { href: `/empleos/${cat.slug}/`, texto: cat.nombre }, { texto: prov.nombre }]
    : cat || prov ? [{ href: "/empleos/", texto: "Empleos" }, { texto: (cat?.nombre ?? prov?.nombre) as string }] : [{ texto: "Empleos" }];

  return (
    <div className="pagina">
      <div className="contenedor contenedor-ancho">
        <Cabecera
          migas={migas}
          titulo={titulo}
          descripcion={descripcion}
        />

        {/* Accesos rápidos (también ayudan a Google a encontrar cada sección) */}
        <nav className="atajos entrada entrada-3" aria-label="Categorías y provincias">
          <Link href={hrefCat()} className={!cat ? "atajo activo" : "atajo"}>Todas</Link>
          {categorias.map((c) => (
            <Link key={c.slug} href={hrefCat(c.slug)} className={cat?.slug === c.slug ? "atajo activo" : "atajo"}>
              <span aria-hidden>{c.icono}</span> {c.nombre}
            </Link>
          ))}
          <span className="atajos-separador" aria-hidden />
          {(cat || prov) && <Link href={hrefProv()} className={!prov ? "atajo activo" : "atajo"}>Toda la región</Link>}
          {provincias.map((p) => (
            <Link key={p.slug} href={hrefProv(p.slug)} className={prov?.slug === p.slug ? "atajo activo" : "atajo"}>
              {p.nombre}
            </Link>
          ))}
        </nav>

        <Anuncio />

        <div style={{ paddingBottom: 72 }}>
          <Suspense>
            <BuscadorEmpleos ofertas={ofertas} guias={guias} fijo={fijo} />
          </Suspense>
          {alertasActivas() && (
            // Invita a recibir por correo lo mismo que está viendo (llega con el tipo y la provincia ya marcados)
            <Link href={`/alertas/${fijo?.cat || fijo?.prov ? `?${new URLSearchParams({ ...(fijo.cat && { cat: fijo.cat }), ...(fijo.prov && { prov: fijo.prov }) })}` : ""}`} className="panel cta-alertas">
              <Icono nombre="correo" tam={26} />
              <span>
                <strong>Recibe estas ofertas en tu correo</strong>
                Te avisamos cuando haya ofertas nuevas{cat ? ` de ${cat.nombre.toLowerCase()}` : ""}{prov ? ` en ${prov.nombre}` : ""}. Gratis.
              </span>
              <Icono nombre="derecha" tam={20} />
            </Link>
          )}
          {pie}
        </div>
      </div>
    </div>
  );
}
