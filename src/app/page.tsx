import Link from "next/link";
import { categorias, provincias } from "@/site.config";
import { getGuias, getOfertas } from "@/lib/content";
import { TarjetaGuia } from "@/components/Tarjetas";
import { Icono, LogoEmpresa, type NombreIcono } from "@/components/OfertaCard";
import MapaIca from "@/components/MapaIca";
import EmpresasCarrusel from "@/components/EmpresasCarrusel";

const ICONOS: Record<string, NombreIcono> = {
  "convocatorias-del-estado": "edificio",
  "empleos-en-empresas": "maletin",
  agroexportacion: "hoja",
  practicas: "birrete",
  "part-time-y-temporada": "reloj",
};

// "Distraroj Sociedad Anonima Cerrada - Distraroj S.A.C." → "Distraroj" (para mostrar; la búsqueda lo encuentra igual)
function nombreCorto(empresa: string) {
  const base = empresa.split(/\s+-\s+/)[0];
  const corto = base
    .replace(/\b(sociedad an[oó]nima cerrada|sociedad an[oó]nima|sociedad comercial de responsabilidad limitada|s\.?\s?a\.?\s?c\.?|s\.?\s?r\.?\s?l(tda)?\.?|e\.?\s?i\.?\s?r\.?\s?l\.?|s\.?\s?a\.?)(?=\s|$|,)/gi, "")
    .replace(/[\s,.-]+$/, "")
    .trim();
  return corto.length >= 3 ? corto : base;
}

export default function Inicio() {
  const todas = getOfertas();
  // Ofertas vigentes al compilar (el sitio se vuelve a generar con cada importación)
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const vigentes = todas.filter((o) => !o.vence || o.vence >= hoy);
  const nuevas = vigentes.slice(0, 3).map(({ html: _html, ...resto }) => resto);
  const cuenta = (campo: "categoria" | "provincia", v: string) => vigentes.filter((o) => o[campo] === v).length;

  // Empresas con más ofertas vigentes (el Estado y las privadas por igual)
  const porEmpresa = new Map<string, { ofertas: number; logo: string }>();
  for (const o of vigentes) {
    const nombre = nombreCorto(o.empresa);
    const actual = porEmpresa.get(nombre) ?? { ofertas: 0, logo: "" };
    porEmpresa.set(nombre, { ofertas: actual.ofertas + 1, logo: actual.logo || o.logo });
  }
  const empresas = [...porEmpresa.entries()]
    .map(([nombre, d]) => ({ nombre, ofertas: d.ofertas, logo: d.logo }))
    .sort((a, b) => b.ofertas - a.ofertas || a.nombre.localeCompare(b.nombre))
    .slice(0, 14);
  const todasGuias = getGuias();
  const guias = todasGuias.slice(0, 3);
  const totalGuias = todasGuias.length;

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

      {/* Tipos de trabajo, justo debajo del buscador */}
      <nav className="contenedor contenedor-ancho categorias-rapidas" aria-label="Tipos de trabajo">
        {categorias.map((cat) => (
          <Link key={cat.slug} href={`/empleos/${cat.slug}/`} className="categoria-rapida">
            <span className="categoria-icono" aria-hidden><Icono nombre={ICONOS[cat.slug] ?? "maletin"} tam={20} /></span>
            <span className="categoria-texto">
              <strong>{cat.nombre}</strong>
              <span>{cuenta("categoria", cat.slug)} ofertas</span>
            </span>
            <Icono nombre="derecha" tam={16} />
          </Link>
        ))}
      </nav>

      <EmpresasCarrusel empresas={empresas} total={vigentes.length} />

      <MapaIca ofertas={todas.map((o) => ({ provincia: o.provincia, vence: o.vence, empresa: o.empresa }))} guias={totalGuias} />

      <section className="nuevas-seccion" aria-labelledby="nuevas-titulo">
        <div className="contenedor contenedor-ancho">
          <div className="resultados-cab">
            <h2 id="nuevas-titulo" className="titulo-seccion">Nuevas ofertas</h2>
            <Link href="/empleos/" className="enlace-flecha">Ver todas ({vigentes.length}) <Icono nombre="derecha" tam={16} /></Link>
          </div>
          {nuevas.length ? (
            <div className="ofertas-mini">
              {nuevas.map((o) => (
                <Link key={o.slug} href={`/ofertas/${o.slug}/`} className="oferta-mini">
                  <span className="oferta-mini-cab">
                    <LogoEmpresa empresa={o.empresa} logo={o.logo} />
                    <span className="oferta-mini-titulos">
                      <strong>{o.title}</strong>
                      <span>{nombreCorto(o.empresa)}</span>
                    </span>
                  </span>
                  <span className="oferta-mini-datos">
                    <span><Icono nombre="pin" tam={15} /> {o.distrito || provincias.find((p) => p.slug === o.provincia)?.nombre}</span>
                    <span className="oc-sueldo"><Icono nombre="billete" tam={15} /> {o.sueldo}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="vacio">Muy pronto publicaremos las primeras ofertas verificadas de la región.</p>
          )}
        </div>
      </section>

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
