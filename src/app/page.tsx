import Link from "next/link";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import { TarjetaGuia, TarjetaOferta } from "@/components/Tarjetas";

export default function Inicio() {
  const ofertas = getOfertas().slice(0, 6);
  const guias = getGuias().slice(0, 3);

  return (
    <>
      <section className="hero">
        <h1 className="entrada">Tu próxima chamba está en Ica</h1>
        <p className="entrada entrada-2">
          Convocatorias, empleos y prácticas en las cinco provincias, verificados y explicados.
        </p>
        <form action="/buscar/" className="buscador entrada entrada-3" role="search">
          <input name="q" type="search" placeholder="Puesto, empresa o palabra clave" aria-label="Buscar empleos" />
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

      <section className="seccion">
        <div className="contenedor">
          <h2 className="centro revelar">¿Qué tipo de trabajo buscas?</h2>
          <div className="grilla">
            {categorias.map((c, i) => (
              <Link
                key={c.slug}
                href={`/empleos/${c.slug}/`}
                className="tarjeta revelar"
                style={{ "--retraso": `${i * 80}ms` } as React.CSSProperties}
              >
                <div className="icono">{c.icono}</div>
                <h3>{c.nombre}</h3>
                <p>{c.corta}</p>
              </Link>
            ))}
            <Link href="/guias/" className="tarjeta revelar" style={{ "--retraso": "400ms" } as React.CSSProperties}>
              <div className="icono">📋</div>
              <h3>Guías para postular</h3>
              <p>CV, entrevistas, CAS y derechos laborales.</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="seccion seccion-suave">
        <div className="contenedor">
          <h2 className="centro revelar">Últimas ofertas</h2>
          {ofertas.length ? (
            <div className="grilla">
              {ofertas.map((o, i) => (
                <TarjetaOferta key={o.slug} oferta={o} i={i} />
              ))}
            </div>
          ) : (
            <p className="vacio revelar" style={{ marginTop: 32 }}>
              Muy pronto publicaremos las primeras ofertas verificadas de la región.
            </p>
          )}
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <h2 className="centro revelar">Guías recientes</h2>
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
          <Link href="/contacto/" className="btn btn-contorno">¿Quieres publicar?</Link>
        </div>
      </section>
    </>
  );
}
