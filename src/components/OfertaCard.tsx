"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { educaciones, experiencias, jornadas, modalidades, provincias } from "@/site.config";
import type { Oferta } from "@/lib/content";

/** Lo que necesita la tarjeta (sin el texto completo del aviso) */
export type OfertaResumen = Omit<Oferta, "html">;

const CLAVE_GUARDADAS = "chamba-guardadas";
const diasEntre = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
const nombreDe = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre ?? "";

/** Fecha de hoy en hora de Lima (en el navegador, para no fijarla al compilar) */
export function useHoy() {
  const [hoy, setHoy] = useState<string | null>(null);
  useEffect(() => setHoy(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })), []);
  return hoy;
}

/** Ofertas guardadas con el corazón: solo en este navegador (se comparten entre pestañas y páginas) */
export function useGuardadas() {
  const [guardadas, setGuardadas] = useState<string[]>([]);
  useEffect(() => {
    const leer = () => {
      try { setGuardadas(JSON.parse(localStorage.getItem(CLAVE_GUARDADAS) ?? "[]")); } catch { setGuardadas([]); }
    };
    leer();
    window.addEventListener("storage", leer);
    window.addEventListener("chamba-guardadas", leer);
    return () => { window.removeEventListener("storage", leer); window.removeEventListener("chamba-guardadas", leer); };
  }, []);
  const alternar = (slug: string) => {
    const n = guardadas.includes(slug) ? guardadas.filter((s) => s !== slug) : [...guardadas, slug];
    setGuardadas(n);
    try { localStorage.setItem(CLAVE_GUARDADAS, JSON.stringify(n)); } catch { /* navegador sin almacenamiento */ }
    window.dispatchEvent(new Event("chamba-guardadas"));
  };
  return [guardadas, alternar] as const;
}

/* ---------- Logo con iniciales de la entidad ---------- */
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

export function LogoEmpresa({ empresa, grande }: { empresa: string; grande?: boolean }) {
  return (
    <span className={`oc-logo ${grande ? "oc-logo-grande" : ""}`} style={{ "--tono": tono(empresa) } as CSSProperties} aria-hidden>
      {iniciales(empresa)}
    </span>
  );
}

/** Estado de la oferta según su fecha límite */
export function estadoOferta(vence: string, hoy: string | null) {
  if (!hoy || !vence) return null;
  const d = diasEntre(vence, hoy);
  if (d < 0) return { texto: "Vencida", clase: "badge-rojo" };
  if (d <= 3) return { texto: d === 0 ? "Cierra hoy" : d === 1 ? "Cierra mañana" : `Cierra en ${d} días`, clase: "badge-naranja" };
  return { texto: `Quedan ${d} días`, clase: "badge-verde" };
}

export function publicadoHace(fecha: string, hoy: string | null) {
  if (!hoy) return "";
  const p = diasEntre(hoy, fecha);
  return p <= 0 ? "Publicado hoy" : p === 1 ? "Publicado ayer" : `Publicado hace ${p} días`;
}

/* ---------- Una oferta en la lista ---------- */
export function OfertaCard({ o, hoy, guardada, guardar }: { o: OfertaResumen; hoy: string | null; guardada: boolean; guardar: (slug: string) => void }) {
  const prov = nombreDe(provincias, o.provincia);
  const nueva = hoy !== null && diasEntre(hoy, o.date) <= 2;
  const estado = estadoOferta(o.vence, hoy);
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
          <span className="oc-fecha">{publicadoHace(o.date, hoy)}</span>
          {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
        </div>
        <div className="oc-cab">
          <LogoEmpresa empresa={o.empresa} />
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
      <BotonCorazon guardada={guardada} onClick={() => guardar(o.slug)} />
    </article>
  );
}

function BotonCorazon({ guardada, onClick, conTexto }: { guardada: boolean; onClick: () => void; conTexto?: boolean }) {
  const etiqueta = guardada ? "Quitar de guardadas" : "Guardar oferta";
  return (
    <button type="button" className={conTexto ? "btn-guardar" : "oc-guardar"} aria-pressed={guardada} aria-label={conTexto ? undefined : etiqueta} title={etiqueta} onClick={onClick}>
      <Icono nombre="corazon" />
      {conTexto && <span>{guardada ? "Guardada" : "Guardar oferta"}</span>}
    </button>
  );
}

/** Botón de guardar para la ficha de una oferta */
export function GuardarOferta({ slug }: { slug: string }) {
  const [guardadas, guardar] = useGuardadas();
  return <BotonCorazon conTexto guardada={guardadas.includes(slug)} onClick={() => guardar(slug)} />;
}

/** Lista simple de ofertas (inicio y ofertas parecidas) */
export function ListaTarjetas({ ofertas }: { ofertas: OfertaResumen[] }) {
  const hoy = useHoy();
  const [guardadas, guardar] = useGuardadas();
  // Las vencidas no se muestran en las listas cortas
  const vigentes = ofertas.filter((o) => !hoy || !o.vence || o.vence >= hoy);
  return (
    <div className="lista-ofertas">
      {vigentes.map((o) => <OfertaCard key={o.slug} o={o} hoy={hoy} guardada={guardadas.includes(o.slug)} guardar={guardar} />)}
    </div>
  );
}

/** Estado de la oferta con fecha (para la ficha) */
export function EstadoBadge({ vence, fecha }: { vence: string; fecha: string }) {
  const hoy = useHoy();
  const estado = estadoOferta(vence, hoy);
  return (
    <>
      {hoy && diasEntre(hoy, fecha) <= 2 && <span className="badge badge-nuevo">Nuevo</span>}
      <span className="oc-fecha">{publicadoHace(fecha, hoy)}</span>
      {estado && <span className={`badge ${estado.clase}`}>{estado.texto}</span>}
    </>
  );
}

/* ---------- Íconos de línea (mismo trazo en todo el sitio) ---------- */
export type NombreIcono =
  | "lupa" | "pin" | "capas" | "edificio" | "medalla" | "birrete" | "reloj" | "calendario" | "billete"
  | "flecha" | "cerrar" | "basura" | "ajustes" | "corazon" | "personas" | "escudo" | "libro" | "enlace" | "check" | "correo" | "derecha";

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
  derecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  basura: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  ajustes: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  corazon: <path d="M12 20s-7-4.4-9-9a4.8 4.8 0 0 1 9-3 4.8 4.8 0 0 1 9 3c-2 4.6-9 9-9 9Z" />,
  personas: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.8-1.6-5-4-5.7" /></>,
  escudo: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
  libro: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z" /><path d="M4 19a2 2 0 0 1 2-2h13v4H6a2 2 0 0 1-2-2Z" /></>,
  enlace: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  correo: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
};

export function Icono({ nombre, tam = 18 }: { nombre: NombreIcono; tam?: number }) {
  return (
    <svg className={`icono icono-${nombre}`} viewBox="0 0 24 24" width={tam} height={tam} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {TRAZOS[nombre]}
    </svg>
  );
}
