"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  categorias, provincias, jornadas, modalidades, experiencias, educaciones, rangosSueldo, fechasPublicacion,
} from "@/site.config";
import type { GuiaBusqueda, OfertaBusqueda } from "@/lib/busqueda";

/* ---------- Filtros: qué se guarda en la dirección (?q=...&cat=...) ---------- */

type Multi = "cat" | "prov" | "jor" | "mod" | "exp" | "edu";
type Filtros = Record<Multi, string[]> & { q: string; sueldo: number; dias: number; vencidas: boolean; orden: string };

const GRUPOS: { clave: Multi; titulo: string; opciones: readonly { slug: string; nombre: string }[]; campo: keyof OfertaBusqueda }[] = [
  { clave: "cat", titulo: "Categoría", opciones: categorias, campo: "categoria" },
  { clave: "prov", titulo: "Provincia", opciones: provincias, campo: "provincia" },
  { clave: "jor", titulo: "Jornada", opciones: jornadas, campo: "jornada" },
  { clave: "mod", titulo: "Modalidad", opciones: modalidades, campo: "modalidad" },
  { clave: "exp", titulo: "Experiencia", opciones: experiencias, campo: "experiencia" },
  { clave: "edu", titulo: "Estudios", opciones: educaciones, campo: "educacion" },
];

const ORDENES = [
  { slug: "recientes", nombre: "Más recientes" },
  { slug: "vence", nombre: "Cierran pronto" },
  { slug: "sueldo", nombre: "Mayor sueldo" },
];

const POR_PAGINA = 12;

// Quita tildes y mayúsculas para que "práctica" encuentre "practica"
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const dinero = (n: number) => `S/ ${n.toLocaleString("es-PE")}`;
const diasEntre = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);

function leerFiltros(p: URLSearchParams): Filtros {
  const lista = (k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
  return {
    q: p.get("q") ?? "",
    cat: lista("cat"), prov: lista("prov"), jor: lista("jor"), mod: lista("mod"), exp: lista("exp"), edu: lista("edu"),
    sueldo: Number(p.get("sueldo")) || 0,
    dias: Number(p.get("dias")) || 0,
    vencidas: p.get("vencidas") === "1",
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
  if (f.orden !== "recientes") p.set("orden", f.orden);
  const s = p.toString();
  return s ? `?${s}` : "";
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

  // Fecha de hoy en hora de Lima (en el navegador, para no fijarla al compilar)
  useEffect(() => setHoy(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })), []);
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
  }, [f, hoy, ofertas]);

  const conteos = useMemo(() => {
    const c: Record<string, Record<string, number>> = {};
    for (const g of GRUPOS) {
      c[g.clave] = {};
      for (const o of filtrar(g.clave)) { const v = String(o[g.campo]); c[g.clave][v] = (c[g.clave][v] ?? 0) + 1; }
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, hoy, ofertas]);

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
    const op = g.opciones.find((o) => o.slug === s);
    if (op) activos.push({ texto: op.nombre, quitar: () => alternar(g.clave, s) });
  }
  if (f.sueldo) activos.push({ texto: `Desde ${dinero(f.sueldo)}`, quitar: () => aplicar({ sueldo: 0 }) });
  if (f.dias) activos.push({ texto: fechasPublicacion.find((d) => d.dias === f.dias)?.nombre ?? "", quitar: () => aplicar({ dias: 0 }) });
  if (f.vencidas) activos.push({ texto: "Incluye vencidas", quitar: () => aplicar({ vencidas: false }) });
  const limpiar = () => { setTexto(""); aplicar({ q: "", cat: [], prov: [], jor: [], mod: [], exp: [], edu: [], sueldo: 0, dias: 0, vencidas: false }); };
  const nFiltros = activos.length - (f.q.trim() ? 1 : 0);

  const grupoVisible = (clave: Multi) => !(clave === "cat" && fijo.cat) && !(clave === "prov" && fijo.prov);

  return (
    <div className="busqueda">
      {/* Barra de búsqueda */}
      <form
        className="busqueda-barra"
        role="search"
        onSubmit={(e) => { e.preventDefault(); aplicar({ q: texto }); }}
      >
        <span className="busqueda-lupa" aria-hidden>🔍</span>
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Puesto, empresa o palabra clave (ej. cajero, CAS, packing)"
          aria-label="Buscar empleos"
        />
        <button className="btn btn-naranja" type="submit">Buscar</button>
      </form>

      <div className="busqueda-cuerpo">
        {/* Panel de filtros (en el celular se abre como hoja desde abajo) */}
        <div className={`filtros-fondo ${panel ? "abierto" : ""}`} onClick={() => setPanel(false)} aria-hidden />
        <aside className={`filtros-panel ${panel ? "abierto" : ""}`} aria-label="Filtros de búsqueda">
          <div className="filtros-cab">
            <strong>Filtros</strong>
            {nFiltros > 0 && <button type="button" className="enlace-btn" onClick={limpiar}>Limpiar todo</button>}
            <button type="button" className="cerrar-panel" onClick={() => setPanel(false)} aria-label="Cerrar filtros">✕</button>
          </div>

          <div className="filtro-grupo">
            <label className="interruptor">
              <input type="checkbox" checked={!f.vencidas} onChange={(e) => aplicar({ vencidas: !e.target.checked })} />
              <span>Solo ofertas vigentes</span>
            </label>
          </div>

          {GRUPOS.filter((g) => grupoVisible(g.clave)).map((g) => (
            <fieldset key={g.clave} className="filtro-grupo">
              <legend>{g.titulo}</legend>
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
            </fieldset>
          ))}

          <fieldset className="filtro-grupo">
            <legend>Sueldo desde</legend>
            <select value={f.sueldo} onChange={(e) => aplicar({ sueldo: Number(e.target.value) })} aria-label="Sueldo mínimo">
              <option value={0}>Cualquier sueldo</option>
              {rangosSueldo.map((s) => <option key={s} value={s}>{dinero(s)} o más</option>)}
            </select>
            <p className="filtro-nota">Las ofertas “a tratar” no aparecen al filtrar por sueldo.</p>
          </fieldset>

          <fieldset className="filtro-grupo">
            <legend>Publicado</legend>
            <label className="opcion"><input type="radio" name="dias" checked={!f.dias} onChange={() => aplicar({ dias: 0 })} /><span>Cualquier fecha</span></label>
            {fechasPublicacion.map((d) => (
              <label key={d.dias} className="opcion">
                <input type="radio" name="dias" checked={f.dias === d.dias} onChange={() => aplicar({ dias: d.dias })} />
                <span>{d.nombre}</span>
              </label>
            ))}
          </fieldset>

          <button type="button" className="btn btn-naranja ver-resultados" onClick={() => setPanel(false)}>
            Ver {resultados.length} {resultados.length === 1 ? "oferta" : "ofertas"}
          </button>
        </aside>

        {/* Resultados */}
        <section className="resultados" aria-live="polite">
          <div className="resultados-cab">
            <p className="muted"><strong>{resultados.length}</strong> {resultados.length === 1 ? "oferta encontrada" : "ofertas encontradas"}</p>
            <div className="resultados-acciones">
              <button type="button" className="btn-filtros" onClick={() => setPanel(true)}>
                ⚙️ Filtros{nFiltros > 0 && <span className="contador">{nFiltros}</span>}
              </button>
              <select value={f.orden} onChange={(e) => aplicar({ orden: e.target.value })} aria-label="Ordenar por" className="orden">
                {ORDENES.map((o) => <option key={o.slug} value={o.slug}>{o.nombre}</option>)}
              </select>
            </div>
          </div>

          {activos.length > 0 && (
            <div className="activos">
              {activos.map((a, i) => (
                <button key={i} type="button" className="activo-chip" onClick={a.quitar} aria-label={`Quitar filtro ${a.texto}`}>
                  {a.texto} <span aria-hidden>✕</span>
                </button>
              ))}
              {activos.length > 1 && <button type="button" className="enlace-btn" onClick={limpiar}>Limpiar todo</button>}
            </div>
          )}

          {resultados.length ? (
            <>
              <div className="lista-ofertas">
                {resultados.slice(0, mostrar).map((o) => <FilaOferta key={o.slug} o={o} hoy={hoy} />)}
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
              <p><strong>{activos.length > 0 ? "No encontramos ofertas con esos filtros." : "Por ahora no hay ofertas vigentes aquí."}</strong></p>
              <p>
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

/* ---------- Una oferta en la lista ---------- */
function FilaOferta({ o, hoy }: { o: OfertaBusqueda; hoy: string | null }) {
  const cat = categorias.find((c) => c.slug === o.categoria);
  const prov = provincias.find((p) => p.slug === o.provincia);
  const etiqueta = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre;
  let estado = <span className="badge">{o.vence ? `Hasta el ${o.vence.split("-").reverse().join("/")}` : "Sin fecha límite"}</span>;
  let publicado = "";
  if (hoy) {
    const d = o.vence ? diasEntre(o.vence, hoy) : null;
    if (d !== null) estado = d < 0 ? <span className="badge badge-rojo">Vencida</span>
      : <span className="badge badge-verde">{d === 0 ? "Cierra hoy" : d === 1 ? "Queda 1 día" : `Quedan ${d} días`}</span>;
    const p = diasEntre(hoy, o.date);
    publicado = p <= 0 ? "Publicado hoy" : p === 1 ? "Publicado ayer" : `Hace ${p} días`;
  }
  const extras = [etiqueta(jornadas, o.jornada), o.modalidad !== "presencial" ? etiqueta(modalidades, o.modalidad) : "", etiqueta(experiencias, o.experiencia)].filter(Boolean);
  return (
    <Link href={`/ofertas/${o.slug}/`} className="fila-oferta">
      <div className="fila-top">
        {estado}
        <span className="fila-fecha">{publicado}</span>
      </div>
      <h3>{o.title}</h3>
      <p className="fila-empresa">{o.empresa}</p>
      {o.resumen && <p className="fila-resumen">{o.resumen}</p>}
      <div className="fila-meta">
        <span>📍 {prov?.nombre}{o.distrito && o.distrito !== prov?.nombre ? `, ${o.distrito}` : ""}</span>
        <span>💰 {o.sueldo}</span>
        <span>{cat?.icono} {cat?.nombre}</span>
        {o.vacantes ? <span>👥 {o.vacantes} {o.vacantes === 1 ? "vacante" : "vacantes"}</span> : null}
      </div>
      {extras.length > 0 && <div className="fila-etiquetas">{extras.map((e) => <span key={e} className="badge">{e}</span>)}</div>}
    </Link>
  );
}
