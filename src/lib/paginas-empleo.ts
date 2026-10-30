/**
 * Páginas de "tipo de trabajo + provincia" (ej. /empleos/practicas/chincha/): son las búsquedas que la gente
 * escribe en Google ("prácticas en Chincha", "convocatorias CAS Pisco"). Cada una lleva un texto propio
 * armado con las ofertas reales de ese momento, para que no sea una página vacía o repetida.
 */
import { categorias, provincias, type CategoriaSlug } from "@/site.config";
import { hoyLima, type Oferta } from "./content";

type Textos = {
  /** Título (y lo que busca la gente en Google) */
  titulo: (prov: string) => string;
  /** Qué se encuentra aquí, en una línea */
  descripcion: (prov: string) => string;
  /** Consejo corto para ese tipo de trabajo */
  consejo: string;
  /** Guía relacionada */
  guia: { slug: string; texto: string };
};

const TEXTOS: Record<CategoriaSlug, Textos> = {
  "convocatorias-del-estado": {
    titulo: (p) => `Convocatorias CAS en ${p}`,
    descripcion: (p) => `Convocatorias CAS y concursos públicos de municipalidades, hospitales y entidades del Estado en la provincia de ${p}.`,
    consejo: "En las convocatorias del Estado cuenta cada documento: revisa las bases, el cronograma y llena los anexos tal como los piden, porque un error de forma te descalifica.",
    guia: { slug: "como-postular-convocatoria-cas", texto: "Cómo postular a una convocatoria CAS paso a paso" },
  },
  "empleos-en-empresas": {
    titulo: (p) => `Trabajo en empresas de ${p}`,
    descripcion: (p) => `Ofertas de trabajo en empresas privadas de la provincia de ${p}: ventas, atención al cliente, almacén, oficina y más.`,
    consejo: "Las empresas privadas suelen cerrar sus avisos apenas llenan el puesto: postula pronto y adapta tu CV a lo que pide cada aviso.",
    guia: { slug: "preguntas-entrevista-de-trabajo", texto: "Preguntas frecuentes en una entrevista de trabajo" },
  },
  agroexportacion: {
    titulo: (p) => `Trabajo en agroexportación en ${p}`,
    descripcion: (p) => `Trabajos en fundos, packing y agroexportadoras de la provincia de ${p}: campo, cosecha, operarios, técnicos y supervisores.`,
    consejo: "En el agro la mayoría de puestos son por campaña: pregunta por el horario, la movilidad, el pago por destajo y si te inscriben en planilla.",
    guia: { slug: "trabajo-en-agroexportacion-ica-regimen-agrario", texto: "Trabajo en agroexportación: tus derechos en el régimen agrario" },
  },
  practicas: {
    titulo: (p) => `Prácticas en ${p}`,
    descripcion: (p) => `Prácticas preprofesionales y profesionales para estudiantes y egresados en la provincia de ${p}, en empresas y en el Estado.`,
    consejo: "Como practicante tienes derecho a una subvención mensual de al menos un sueldo mínimo por jornada completa, a un seguro y a descanso. Nadie puede cobrarte por darte la práctica.",
    guia: { slug: "derechos-de-los-practicantes-peru", texto: "Derechos de los practicantes en el Perú" },
  },
  "part-time-y-temporada": {
    titulo: (p) => `Trabajo part time en ${p}`,
    descripcion: (p) => `Trabajos de medio tiempo, por horas y por temporada en la provincia de ${p}, ideales para estudiantes o como ingreso extra.`,
    consejo: "En los trabajos part time pide por escrito tu horario y cuánto te pagan por hora o por día antes de empezar.",
    guia: { slug: "planilla-o-recibo-por-honorarios-tipos-de-contrato", texto: "¿Planilla o recibo por honorarios? Tipos de contrato" },
  },
};

export type PaginaEmpleo = {
  cat: (typeof categorias)[number];
  prov: (typeof provincias)[number];
  titulo: string;
  descripcion: string;
  consejo: string;
  guia: { slug: string; texto: string };
  /** Ofertas abiertas al compilar */
  abiertas: number;
  /** Ofertas de esta combinación, abiertas o no */
  total: number;
  /** Empresas o entidades que más publican aquí */
  empresas: string[];
};

/** Todas las combinaciones tipo de trabajo × provincia */
export const combinaciones = () => categorias.flatMap((c) => provincias.map((p) => ({ categoria: c.slug, provincia: p.slug })));

export function paginaEmpleo(ofertas: Oferta[], categoria: string, provincia: string): PaginaEmpleo | null {
  const cat = categorias.find((c) => c.slug === categoria);
  const prov = provincias.find((p) => p.slug === provincia);
  if (!cat || !prov) return null;
  const t = TEXTOS[cat.slug];
  const hoy = hoyLima();
  const aqui = ofertas.filter((o) => o.categoria === cat.slug && o.provincia === prov.slug);
  const abiertas = aqui.filter((o) => !o.vence || o.vence >= hoy);
  // Las que más se repiten primero
  const cuenta = new Map<string, number>();
  for (const o of aqui) cuenta.set(o.empresa, (cuenta.get(o.empresa) ?? 0) + 1);
  const empresas = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([e]) => e);
  return {
    cat, prov,
    titulo: t.titulo(prov.nombre),
    descripcion: t.descripcion(prov.nombre),
    consejo: t.consejo,
    guia: t.guia,
    abiertas: abiertas.length,
    total: aqui.length,
    empresas,
  };
}
