"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  categorias, provincias, jornadas, modalidades, experiencias, educaciones, rangosSueldo, fechasPublicacion,
} from "@/site.config";
import type { GuiaBusqueda, OfertaBusqueda } from "@/lib/busqueda";

/* ---------- Filtros: qué se guarda en la dirección (?q=...&cat=...) ---------- */

type Multi = "cat" | "prov" | "jor" | "mod" | "exp" | "edu";
type Filtros = Record<Multi, string[]> & { q: string; sueldo: number; dias: number; vencidas: boolean; guardadas: boolean; orden: string };

const GRUPOS: { clave: Multi; titulo: string; icono: NombreIcono; opciones: readonly { slug: string; nombre: string }[]; campo: keyof OfertaBusqueda }[] = [
  { clave: "cat", titulo: "Categoría", icono: "capas", opciones: categorias, campo: "categoria" },
  { clave: "prov", titulo: "Provincia", icono: "pin", opciones: provincias, campo: "provincia" },
  { clave: "mod", titulo: "Modalidad de trabajo", icono: "edificio", opciones: modalidades, campo: "modalidad" },
  { clave: "exp", titulo: "Experiencia", icono: "medalla", opciones: experiencias, campo: "experiencia" },
  { clave: "edu", titulo: "Estudios", icono: "birrete", opciones: educaciones, campo: "educacion" },
  { clave: "jor", titulo: "Jornada", icono: "reloj", opciones: jornadas, campo: "jornada" },
];

const ORDENES = [
  { slug: "recientes", nombre: "Recientes" },
  { slug: "vence", nombre: "Cierran pronto" },
  { slug: "sueldo", nombre: "Mayor sueldo" },
];

const POR_PAGINA = 12;
const CLAVE_GUARDADAS = "chamba-guardadas";

// Quita tildes y mayúsculas para que "práctica" encuentre "practica"
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const dinero = (n: number) => `S/ ${n.toLocaleString("es-PE")}`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const nombreDe = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre ?? "";

function leerFiltros(p: URLSearchParams): Filtros {
  const lista = (k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
  return {
    q: p.get("q") ?? "",
    cat: lista("cat"), prov: lista("prov"), jor: lista("jor"), mod: lista("mod"), exp: lista("exp"), edu: lista("edu"),
    sueldo: Number(p.get("sueldo")) || 0,
    dias: Number(p.get("dias")) || 0,
    vencidas: p.get("vencidas") === "1",
    guardadas: p.get("guardadas") === "1",
    orden: p.get("orden") ?? "recientes",
  };
}

function aDireccion(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const g of GRUPOS) if (f[g.clave].length) p.set(g.clave, f[g.clave].join(","));
  if (f.sueldo) p.set("sueldo", String(f.sueldo));
  if (f.dias) p.set("dias", String(f.dias));
  if (f.vencidas) p.set("vencidas", "1");
  if (f.guardadas) p.set("guardadas", "1");
  if (f.orden !== "recientes") p.set("orden", f.orden);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Ofertas guardadas con el corazón: solo en este navegador
function leerGuardadas(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAVE_GUARDADAS) ?? "[]"); } catch { return []; }
}
function escribirGuardadas(lista: string[]) {
  try { localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify(lista)); } catch { /* navegador sin almacenamiento */ }
}

type Props = {
  ofertas: OfertaBusqueda[];
  guias?: GuiaBusqueda[];
  /** Filtro fijo de la página (ej. la página de Prácticas o de Pisco) */
  fijo?: { cat?: string; prov?: string };
};

export default function BuscadorEmpleos({ ofertas, guias = [], fijo = {} }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState<Filtros>(() => leerFiltros(params));
  const [texto, setTexto] = useState(f.q);
  const [hoy, setHoy] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);
  const [mostrar, setMostrar] = useState(POR_PAGINA);
  const [guardadas, setGuardadas] = useState<string[]>([]);
  // Grupos de filtros desplegados: los que tienen algo marcado (o el primero, para que se note que se abren)
  const [abiertos, setAbiertos] = useState<string[]>(() => {
    const conAlgo = GRUPOS.filter((g) => f[g.clave].length).map((g) => g.clave as string);
    if (f.dias) conAlgo.push("dias");
    if (f.sueldo) conAlgo.push("sueldo");
    return conAlgo.length ? conAlgo : [fijo.cat ? "prov" : "cat"];
  });

  // Fecha de hoy en hora de Lima (en el navegador, para no fijarla al compilar)
  useEffect(() => setHoy(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })), []);
  useEffect(() => setGuardadas(leerGuardadas()), []);
  // Si cambia la dirección (atrás/adelante del navegador), se actualizan los filtros
  useEffect(() => { const n = leerFiltros(params); setF(n); setTexto(n.q); }, [params]);
  // Con el panel abierto en el celular no se mueve la página de fondo
  useEffect(() => { document.body.style.overflow = panel ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [panel]);

  const aplicar = (cambio: Partial<Filtros>) => {
    const n = { ...f, ...cambio };
    setF(n);
    setMostrar(POR_PAGINA);
    router.replace(`${pathname}${aDireccion(n)}`, { scroll: false });
  };
  const alternar = (clave: Multi, slug: string) =>
    aplicar({ [clave]: f[clave].includes(slug) ? f[clave].filter((x) => x !== slug) : [...f[clave], slug] });
  const plegar = (id: string) => setAbiertos((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const guardar = (slug: string) => {
    const n = guardadas.includes(slug) ? guardadas.filter((s) => s !== slug) : [...guardadas, slug];
    setGuardadas(n);
    escribirGuardadas(n);
  };

  // Las ofertas que pasan todos los filtros, salvo el grupo indicado (para contar cuántas hay por opción)
  const filtrar = (sin?: Multi) => {
    const palabras = normalizar(f.q).split(/\s+/).filter(Boolean);
    return ofertas.filter((o) => {
      if (fijo.cat && o.categoria !== fijo.cat) return false;
      if (fijo.prov && o.provincia !== fijo.prov) return false;
      for (const g of GRUPOS) {
        if (g.clave === sin || !f[g.clave].length) continue;
        if (!f[g.clave].includes(String(o[g.campo]))) return false;
      }
      if (f.guardadas && !guardadas.includes(o.slug)) return false;
      if (f.sueldo && (o.sueldoMin == null || o.sueldoMin < f.sueldo)) return false;
      if (hoy && f.dias && diasEntre(hoy, o.date) > f.dias) return false;
      if (hoy && !f.vencidas && o.vence && o.vence < hoy) return false;
      if (palabras.length) {
        const t = normalizar(o.texto);
        if (!palabras.every((p) => t.includes(p))) return false;
      }
      return true;
    });
  };

  const resultados = useMemo(() => {
    const r = filtrar();
    if (f.orden === "vence") r.sort((a, b) => (a.vence || "9999").localeCompare(b.vence || "9999"));
    else if (f.orden === "sueldo") r.sort((a, b) => (b.sueldoMin ?? -1) - (a.sueldoMin ?? -1));
    else r.sort((a, b) => b.date.localeCompare(a.date));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, hoy, ofertas, guardadas]);

  const conteos = useMemo(() => {
    const c: Record<string, Record<string, number>> = {};
    for (const g of GRUPOS) {
      c[g.clave] = {};
      for (const o of filtrar(g.clave)) { const v = String(o[g.campo]); c[g.clave][v] = (c[g.clave][v] ?? 0) + 1; }
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, hoy, ofertas, guardadas]);

  // ¿Hay ofertas que solo se ocultan por estar vencidas? (para ofrecer verlas)
  const hayVencidas = useMemo(
    () => !f.vencidas && hoy !== null && ofertas.some((o) => (!fijo.cat || o.categoria === fijo.cat) && (!fijo.prov || o.provincia === fijo.prov) && o.vence && o.vence < hoy),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f.vencidas, hoy, ofertas],
  );

  const guiasHalladas = useMemo(() => {
    const palabras = normalizar(f.q).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return guias.filter((g) => { const t = normalizar(g.texto); return palabras.every((p) => t.includes(p)); }).slice(0, 4);
  }, [f.q, guias]);

  // Etiquetas de los filtros activos (cada una se puede quitar)
  const activos: { texto: string; quitar: () => void }[] = [];
  if (f.q.trim()) activos.push({ texto: `“${f.q.trim()}”`, quitar: () => { setTexto(""); aplicar({ q: "" }); } });
  for (const g of GRUPOS) for (const s of f[g.clave]) {
    const nombre = nombreDe(g.opciones, s);
    if (nombre) activos.push({ texto: nombre, quitar: () => alternar(g.clave, s) });
  }
  if (f.sueldo) activos.push({ texto: `Desde ${dinero(f.sueldo)}`, quitar: () => aplicar({ sueldo: 0 }) });
  if (f.dias) activos.push({ texto: fechasPublicacion.find((d) => d.dias === f.dias)?.nombre ?? "", quitar: () => aplicar({ dias: 0 }) });
  if (f.guardadas) activos.push({ texto: "Mis guardadas", quitar: () => aplicar({ guardadas: false }) });
  if (f.vencidas) activos.push({ texto: "Incluye vencidas", quitar: () => aplicar({ vencidas: false }) });
  const limpiar = () => { setTexto(""); aplicar({ q: "", cat: [], prov: [], jor: [], mod: [], exp: [], edu: [], sueldo: 0, dias: 0, vencidas: false, guardadas: false }); };
  const nFiltros = activos.length - (f.q.trim() ? 1 : 0);

  const grupoVisible = (clave: Multi) => !(clave === "cat" && fijo.cat) && !(clave === "prov" && fijo.prov);
  const lugar = fijo.prov ? nombreDe(provincias, fijo.prov) : f.prov.length === 1 ? nombreDe(provincias, f.prov[0]) : "la región Ica";

  return (
    <div className="busqueda">
      {/* Barra de búsqueda: palabra clave + provincia */}
      <form className="busqueda-barra" role="search" onSubmit={(e) => { e.preventDefault(); aplicar({ q: texto }); }}>
        <label className="bb-campo bb-texto">
          <Icono nombre="lupa" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Puesto, empresa o palabra clave"
            aria-label="Buscar empleos"
          />
        </label>
        {!fijo.prov && (
          <label className="bb-campo bb-lugar">
            <Icono nombre="pin" />
            <select
              value={f.prov.length === 1 ? f.prov[0] : f.prov.length ? "varias" : ""}
              onChange={(e) => aplicar({ prov: e.target.value ? [e.target.value] : [] })}
              aria-label="Provincia"
            >
              <option value="">Toda la región</option>
              {f.prov.length > 1 && <option value="varias" disabled>Varias provincias</option>}
              {provincias.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}
            </select>
          </label>
        )}
        <button className="btn btn-naranja bb-boton" type="submit" aria-label="Buscar">
          <Icono nombre="lupa" /> <span>Buscar</span>
        </button>
      </form>

      <div className="busqueda-cuerpo">
        {/* Panel de filtros (en el celular se abre como hoja desde abajo) */}
        <div className={`filtros-fondo ${panel ? "abierto" : ""}`} onClick={() => setPanel(false)} aria-hidden />
        <aside className={`filtros-panel ${panel ? "abierto" : ""}`} aria-label="Filtros de búsqueda">
          <div className="filtros-cab">
            <strong>Filtrar ofertas</strong>
            <button type="button" className="cerrar-panel" onClick={() => setPanel(false)} aria-label="Cerrar filtros">
              <Icono nombre="cerrar" />
            </button>
          </div>

          {activos.length > 0 && (
            <div className="activos activos-panel">
              {activos.map((a, i) => (
                <button key={i} type="button" className="activo-chip" onClick={a.quitar} aria-label={`Quitar filtro ${a.texto}`}>
                  {a.texto} <Icono nombre="cerrar" />
                </button>
              ))}
            </div>
          )}

          <div className="interruptores">
            <label className="interruptor">
              <span>Solo vigentes</span>
              <input type="checkbox" role="switch" checked={!f.vencidas} onChange={(e) => aplicar({ vencidas: !e.target.checked })} />
            </label>
            <label className="interruptor">
              <span>Mis guardadas <small>{guardadas.length}</small></span>
              <input type="checkbox" role="switch" checked={f.guardadas} onChange={(e) => aplicar({ guardadas: e.target.checked })} />
            </label>
          </div>

          <GrupoFiltro id="dias" titulo="Fecha de publicación" icono="calendario" abierto={abiertos.includes("dias")} plegar={plegar} marcados={f.dias ? 1 : 0}>
            <label className="opcion"><input type="radio" name="dias" checked={!f.dias} onChange={() => aplicar({ dias: 0 })} /><span>Cualquier fecha</span></label>
            {fechasPublicacion.map((d) => (
              <label key={d.dias} className="opcion">
                <input type="radio" name="dias" checked={f.dias === d.dias} onChange={() => aplicar({ dias: d.dias })} />
                <span>{d.nombre}</span>
              </label>
            ))}
          </GrupoFiltro>

          {GRUPOS.filter((g) => grupoVisible(g.clave)).map((g) => (
            <GrupoFiltro key={g.clave} id={g.clave} titulo={g.titulo} icono={g.icono} abierto={abiertos.includes(g.clave)} plegar={plegar} marcados={f[g.clave].length}>
              {g.opciones.map((op) => {
                const n = conteos[g.clave]?.[op.slug] ?? 0;
                const marcado = f[g.clave].includes(op.slug);
                return (
                  <label key={op.slug} className={`opcion ${!n && !marcado ? "sin" : ""}`}>
                    <input type="checkbox" checked={marcado} onChange={() => alternar(g.clave, op.slug)} />
                    <span>{op.nombre}</span>
                    <small>{n}</small>
                  </label>
                );
              })}
            </GrupoFiltro>
          ))}

          <GrupoFiltro id="sueldo" titulo="Sueldo" icono="billete" abierto={abiertos.includes("sueldo")} plegar={plegar} marcados={f.sueldo ? 1 : 0}>
            <label className="opcion"><input type="radio" name="sueldo" checked={!f.sueldo} onChange={() => aplicar({ sueldo: 0 })} /><span>Cualquier sueldo</span></label>
            {rangosSueldo.map((s) => (
              <label key={s} className="opcion">
                <input type="radio" name="sueldo" checked={f.sueldo === s} onChange={() => aplicar({ sueldo: s })} />
                <span>Desde {dinero(s)}</span>
              </label>
            ))}
            <p className="filtro-nota">Las ofertas con sueldo “a tratar” no aparecen al filtrar por sueldo.</p>
          </GrupoFiltro>

          {nFiltros > 0 && (
            <button type="button" className="limpiar-todo" onClick={limpiar}>
              <Icono nombre="basura" /> Limpiar filtros
            </button>
          )}

          <Link href="/publica/" className="panel-publica">
            <strong>¿Tienes un puesto libre?</strong>
            <span>Publica tu oferta gratis y llega a postulantes de toda la región.</span>
          </Link>

          <button type="button" className="btn btn-naranja ver-resultados" onClick={() => setPanel(false)}>
            Ver {resultados.length} {resultados.length === 1 ? "oferta" : "ofertas"}
          </button>
        </aside>

        {/* Resultados */}
        <section className="resultados" aria-live="polite">
          <div className="resultados-cab">
            <p><strong>{resultados.length}</strong> {resultados.length === 1 ? "empleo encontrado" : "empleos encontrados"} en {lugar}</p>
            <div className="resultados-acciones">
              <button type="button" className="btn-filtros" onClick={() => setPanel(true)}>
                <Icono nombre="ajustes" /> Filtros{nFiltros > 0 && <span className="contador">{nFiltros}</span>}
              </button>
              <div className="orden" role="group" aria-label="Ordenar por">
                <span className="orden-label">Ordenar por</span>
                {ORDENES.map((o) => (
                  <button key={o.slug} type="button" aria-pressed={f.orden === o.slug} onClick={() => aplicar({ orden: o.slug })}>
                    {o.nombre}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activos.length > 0 && (
            <div className="activos activos-movil">
              {activos.map((a, i) => (
                <button key={i} type="button" className="activo-chip" onClick={a.quitar} aria-label={`Quitar filtro ${a.texto}`}>
                  {a.texto} <Icono nombre="cerrar" />
                </button>
              ))}
              {activos.length > 1 && <button type="button" className="enlace-btn" onClick={limpiar}>Limpiar todo</button>}
            </div>
          )}

          {resultados.length ? (
            <>
              <div className="lista-ofertas">
                {resultados.slice(0, mostrar).map((o, i) => (
                  <FragmentoConAviso key={o.slug} mostrarAviso={i === 2 && !f.q.trim()}>
                    <TarjetaOferta o={o} hoy={hoy} guardada={guardadas.includes(o.slug)} guardar={guardar} />
                  </FragmentoConAviso>
                ))}
              </div>
              {resultados.length > mostrar && (
                <p className="centro" style={{ marginTop: 24 }}>
                  <button type="button" className="btn btn-contorno" onClick={() => setMostrar((m) => m + POR_PAGINA)}>
                    Ver más ofertas ({resultados.length - mostrar})
                  </button>
                </p>
              )}
            </>
          ) : (
            <div className="vacio">
              <p><strong>
                {f.guardadas && !guardadas.length ? "Aún no guardas ninguna oferta." : activos.length > 0 ? "No encontramos ofertas con esos filtros." : "Por ahora no hay ofertas vigentes aquí."}
              </strong></p>
              <p>
                {f.guardadas && !guardadas.length && <>Toca el corazón de una oferta para tenerla a la mano. </>}
                {activos.length > 0 && <>Prueba quitando algún filtro o <button type="button" className="enlace-btn" onClick={limpiar}>límpialos todos</button>. </>}
                {!f.vencidas && hayVencidas && <>También puedes <button type="button" className="enlace-btn" onClick={() => aplicar({ vencidas: true })}>ver las ofertas que ya cerraron</button>. </>}
                Mientras tanto, revisa nuestras <Link href="/guias/">guías para postular</Link>.
              </p>
            </div>
          )}

          {guiasHalladas.length > 0 && (
            <div className="guias-halladas">
              <h2>Guías relacionadas con “{f.q.trim()}”</h2>
              <div className="grilla" style={{ marginTop: 12 }}>
                {guiasHalladas.map((g) => (
                  <Link key={g.slug} href={`/guias/${g.slug}/`} className="tarjeta">
                    <span className="badge">Guía</span>
                    <h3>{g.title}</h3>
                    <p>{g.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Grupo de filtros que se despliega ---------- */
function GrupoFiltro({ id, titulo, icono, abierto, plegar, marcados, children }: {
  id: string; titulo: string; icono: NombreIcono; abierto: boolean; plegar: (id: string) => void; marcados: number; children: ReactNode;
}) {
  return (
    <div className={`filtro-grupo ${abierto ? "abierto" : ""}`}>
      <button type="button" className="fg-cabeza" aria-expanded={abierto} aria-controls={`fg-${id}`} onClick={() => plegar(id)}>
        <Icono nombre={icono} />
        <span>{titulo}</span>
        {marcados > 0 && <span className="contador">{marcados}</span>}
        <Icono nombre="flecha" />
      </button>
      <div className="fg-cuerpo" id={`fg-${id}`} inert={!abierto}>
        <div className="fg-opciones">{children}</div>
      </div>
    </div>
  );
}

/* Después de la tercera oferta va un aviso con la guía para postular a un CAS */
function FragmentoConAviso({ mostrarAviso, children }: { mostrarAviso: boolean; children: ReactNode }) {
  return (
    <>
      {children}
      {mostrarAviso && (
        <Link href="/guias/como-postular-convocatoria-cas/" className="aviso-guia">
          <span className="aviso-icono" aria-hidden>📋</span>
          <span className="aviso-texto">
            <strong>¿Primera vez postulando a una convocatoria CAS?</strong>
            <span>Te explicamos paso a paso qué documentos piden y cómo no quedar fuera por un error.</span>
          </span>
          <span className="aviso-boton">Leer la guía</span>
        </Link>
      )}
    </>
  );
}

/* ---------- Una oferta en la lista ---------- */
const PALABRAS_VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "en", "para", "por", "a", "al", "sac", "s.a.c.", "sa", "s.a.", "eirl", "srl"]);
const TONOS = ["#0b3d91", "#f97316", "#16a34a", "#7c3aed", "#0891b2", "#db2777"];

function iniciales(empresa: string) {
  const palabras = empresa.replace(/[()]/g, " ").split(/\s+/).filter((p) => p && !PALABRAS_VACIAS.has(p.toLowerCase()));
  return (palabras.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}
function tono(texto: string) {
  let h = 0;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[h % TONOS.length];
}

function TarjetaOferta({ o, hoy, guardada, guardar }: { o: OfertaBusqueda; hoy: string | null; guardada: boolean; guardar: (slug: string) => void }) {
  const prov = nombreDe(provincias, o.provincia);
  let publicado = "";
  let nueva = false;
  let estado: { texto: string; clase: string } | null = null;
  if (hoy) {
    const p = diasEntre(hoy, o.date);
    nueva = p <= 2;
    publicado = p <= 0 ? "Publicado hoy" : p === 1 ? "Publicado ayer" : `Publicado hace ${p} días`;
    const d = o.vence ? diasEntre(o.vence, hoy) : null;
    if (d !== null) estado = d < 0 ? { texto: "Vencida", clase: "badge-rojo" }
      : d <= 3 ? { texto: d === 0 ? "Cierra hoy" : d === 1 ? "Cierra mañana" : `Cierra en ${d} días`, clase: "badge-naranja" }
      : { texto: `Quedan ${d} días`, clase: "badge-verde" };
  }
  const chips = [
    o.vacantes && o.vacantes > 1 ? { icono: "personas" as const, texto: `${o.vacantes} vacantes` } : null,
    o.experiencia ? { icono: "medalla" as const, texto: nombreDe(experiencias, o.experiencia) } : null,
    o.educacion ? { icono: "birrete" as const, texto: nombreDe(educaciones, o.educacion) } : null,
  ].filter((c) => c && c.texto) as { icono: NombreIcono; texto: string }[];

  return (
    <article className={`oferta-card ${nueva ? "nueva" : ""} ${estado?.clase === "badge-rojo" ? "vencida" : ""}`}>
      <div className="oc-principal">
        <div className="oc-top">
          {nueva && <span className="badge badge-nuevo">Nuevo</span>}
          <span className="oc-fecha">{publicado}</span>
          {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
        </div>
        <div className="oc-cab">
          <span className="oc-logo" style={{ "--tono": tono(o.empresa) } as CSSProperties} aria-hidden>{iniciales(o.empresa)}</span>
          <div className="oc-titulos">
            <h3><Link href={`/ofertas/${o.slug}/`} className="oc-enlace">{o.title}</Link></h3>
            <p className="oc-empresa">{o.empresa}</p>
          </div>
        </div>
        {o.resumen && <p className="oc-resumen">{o.resumen}</p>}
        {chips.length > 0 && (
          <div className="oc-chips">
            {chips.map((c) => <span key={c.texto} className="oc-chip"><Icono nombre={c.icono} /> {c.texto}</span>)}
          </div>
        )}
      </div>
      <ul className="oc-datos">
        <li><Icono nombre="pin" /> {o.distrito && o.distrito !== prov ? `${o.distrito}, ${prov}` : prov}</li>
        <li><Icono nombre="edificio" /> {nombreDe(modalidades, o.modalidad) || "Presencial"}</li>
        {o.jornada && <li><Icono nombre="reloj" /> {nombreDe(jornadas, o.jornada)}</li>}
        <li className="oc-sueldo"><Icono nombre="billete" /> {o.sueldo}</li>
      </ul>
      <button
        type="button"
        className="oc-guardar"
        aria-pressed={guardada}
        aria-label={guardada ? "Quitar de guardadas" : "Guardar oferta"}
        title={guardada ? "Quitar de guardadas" : "Guardar oferta"}
        onClick={() => guardar(o.slug)}
      >
        <Icono nombre="corazon" />
      </button>
    </article>
  );
}

/* ---------- Íconos de línea (mismo trazo en todo el buscador) ---------- */
type NombreIcono =
  | "lupa" | "pin" | "capas" | "edificio" | "medalla" | "birrete" | "reloj" | "calendario" | "billete"
  | "flecha" | "cerrar" | "basura" | "ajustes" | "corazon" | "personas";

const TRAZOS: Record<NombreIcono, ReactNode> = {
  lupa: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  pin: <><path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  capas: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  edificio: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>,
  medalla: <><circle cx="12" cy="9" r="5" /><path d="m8.5 13-1.5 8 5-3 5 3-1.5-8" /></>,
  birrete: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v5" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendario: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  billete: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>,
  flecha: <path d="m6 9 6 6 6-6" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  basura: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  corazon: <path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9Z" />,
  personas: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.6-5-4-5.7" /></>,
};

function Icono({ nombre }: { nombre: NombreIcono }) {
  return (
    <svg className={`icono icono-${nombre}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {TRAZOS[nombre]}
    </svg>
  );
}
