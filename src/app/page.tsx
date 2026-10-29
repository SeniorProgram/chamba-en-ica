import Link from "next/link";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import { TarjetaGuia } from "@/components/Tarjetas";
import { Icono, ListaTarjetas } from "@/components/OfertaCard";

export default function Inicio() {
  const todas = getOfertas();
  const ofertas = todas.slice(0, 6).map(({ html: _html, ...resto }) => resto);
  const cuenta = (campo: "categoria" | "provincia", v: string) => todas.filter((o) => o[campo] === v).length;
  const guias = getGuias().slice(0, 3);

  return (
    <>
      <section className="hero">
        <h1 className="entrada">Tu próxima chamba está en Ica</h1>
        <p className="entrada entrada-2">
          Convocatorias, empleos y prácticas en las cinco provincias, verificados y explicados.
        </p>
        <form action="/buscar/" className="buscador buscador-hero entrada entrada-3" role="search">
          <input name="q" type="search" placeholder="Puesto, empresa o palabra clave" aria-label="Buscar empleos" />
          <select name="prov" aria-label="Provincia" defaultValue="">
            <option value="">Toda la región</option>
            {provincias.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}
          </select>
          <button className="btn btn-naranja" type="submit">Buscar</button>
        </form>
        <p className="provincias-label entrada entrada-4">Busca por provincia</p>
        <div className="provincias entrada entrada-4">
          {provincias.map((p) => (
            <Link key={p.slug} href={`/provincia/${p.slug}/`} className="chip">
              {p.nombre}
            </Link>
          ))}
        </div>
      </section>

      <div className="pagina pagina-inicio">
        <div className="contenedor contenedor-ancho">
          <div className="layout layout-izq">
            <aside className="lateral">
              <nav className="panel" aria-label="Categorías">
                <p className="panel-titulo">¿Qué tipo de trabajo buscas?</p>
                <ul className="lista-enlaces">
                  {categorias.map((cat) => (
                    <li key={cat.slug}>
                      <Link href={`/empleos/${cat.slug}/`}>
                        <span aria-hidden>{cat.icono}</span> {cat.nombre} <small>{cuenta("categoria", cat.slug)}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav className="panel" aria-label="Provincias">
                <p className="panel-titulo">Por provincia</p>
                <div className="chips-lateral">
                  {provincias.map((pr) => (
                    <Link key={pr.slug} href={`/provincia/${pr.slug}/`} className="atajo">
                      {pr.nombre} <small>{cuenta("provincia", pr.slug)}</small>
                    </Link>
                  ))}
                </div>
              </nav>
              <Link href="/publica/" className="panel-publica">
                <strong>¿Tu empresa está contratando?</strong>
                <span>Publica tu oferta gratis y llega a postulantes de toda la región.</span>
              </Link>
            </aside>

            <section className="principal">
              <div className="resultados-cab">
                <h2 className="titulo-seccion">Últimas ofertas</h2>
                <Link href="/empleos/" className="enlace-flecha">Ver todas ({todas.length}) <Icono nombre="derecha" tam={16} /></Link>
              </div>
              {ofertas.length ? (
                <ListaTarjetas ofertas={ofertas} />
              ) : (
                <p className="vacio">Muy pronto publicaremos las primeras ofertas verificadas de la región.</p>
              )}
              <p className="centro" style={{ marginTop: 24 }}>
                <Link href="/empleos/" className="btn btn-naranja">Ver todas las ofertas</Link>
              </p>
            </section>
          </div>
        </div>
      </div>

      <section className="seccion">
        <div className="contenedor">
          <h2 className="centro revelar">Guías para postular con ventaja</h2>
          <div className="grilla">
            {guias.map((g, i) => (
              <TarjetaGuia key={g.slug} guia={g} i={i} />
            ))}
          </div>
          <p className="centro revelar" style={{ marginTop: 32 }}>
            <Link href="/guias/" className="btn btn-contorno">Ver todas las guías</Link>
          </p>
        </div>
      </section>

      <section className="seccion seccion-suave">
        <div className="contenedor ventajas">
          <div className="revelar"><strong>✓ Ofertas verificadas</strong><span>Cada aviso indica su fuente oficial.</span></div>
          <div className="revelar" style={{ "--retraso": "100ms" } as React.CSSProperties}><strong>✓ 100 % regional</strong><span>Solo empleos en las cinco provincias de Ica.</span></div>
          <div className="revelar" style={{ "--retraso": "200ms" } as React.CSSProperties}><strong>✓ Siempre gratis</strong><span>Nunca cobramos por postular.</span></div>
        </div>
      </section>

      <section className="seccion centro">
        <div className="contenedor angosto revelar">
          <p>¿Tu empresa está contratando en Ica? Difunde tu oferta gratis.</p>
          <Link href="/publica/" className="btn btn-contorno">Publica tu oferta gratis</Link>
        </div>
      </section>
    </>
  );
}
