import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";
import type { CategoriaSlug, EducacionSlug, ExperienciaSlug, JornadaSlug, ModalidadSlug, ProvinciaSlug } from "@/site.config";

const CONTENT = path.join(process.cwd(), "content");

marked.setOptions({ gfm: true });

function readDir(dir: string) {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    // Los archivos que empiezan con "_" (como _plantilla.md) no se publican
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(full, file), "utf8");
      const { data, content } = matter(raw);
      return { slug: file.replace(/\.md$/, ""), data, body: content };
    });
}

const toDate = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ""));

/* ---------- Guías ---------- */

export type GuiaGrupo = "beneficios" | "postula" | "cuidate";

export type Guia = {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  grupo: GuiaGrupo;
  /** Portada (ilustración o foto) y su descripción para lectores de pantalla */
  imagen: string;
  imagenAlt: string;
  html: string;
  /** Subtítulos de la guía, para el índice "En esta guía" */
  secciones: { id: string; titulo: string }[];
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Agrega un id a cada subtítulo (para enlazar a la sección) y carga las imágenes sin frenar la página. */
function prepararHtml(html: string) {
  const secciones: { id: string; titulo: string }[] = [];
  const conIds = html
    .replace(/<h2>(.*?)<\/h2>/g, (_, t: string) => {
      const titulo = t.replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");
      const id = sinTildes(titulo).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      // El índice ya numera las secciones: se quita el "1." del subtítulo
      secciones.push({ id, titulo: titulo.replace(/^\d+\.\s*/, "") });
      return `<h2 id="${id}">${t}</h2>`;
    })
    .replace(/<img /g, "<img loading=\"lazy\" decoding=\"async\" ");
  return { html: conIds, secciones };
}

export function getGuias(): Guia[] {
  return readDir("guias")
    .map(({ slug, data, body }) => ({
      slug,
      title: String(data.title),
      description: String(data.description ?? ""),
      date: toDate(data.date),
      updated: toDate(data.updated ?? data.date),
      grupo: (data.grupo ?? "postula") as GuiaGrupo,
      imagen: texto(data.imagen),
      imagenAlt: texto(data.imagen_alt),
      ...prepararHtml(marked.parse(body) as string),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getGuia = (slug: string) => getGuias().find((g) => g.slug === slug);

/* ---------- Ofertas de empleo ---------- */

export type Oferta = {
  slug: string;
  title: string;
  empresa: string;
  categoria: CategoriaSlug;
  provincia: ProvinciaSlug;
  date: string;
  vence: string;
  sueldo: string;
  fuente: string;
  /** De dónde se tomó el aviso (ej. Talento Perú). Vacío si lo publicó la empresa */
  origen: string;
  /** Logo de la empresa guardado en public/img/empresas (vacío si no tiene) */
  logo: string;
  resumen: string;
  html: string;
  // Opcionales (para los filtros); vacíos si la oferta no los indica
  sueldoMin: number | null;
  jornada: JornadaSlug | "";
  modalidad: ModalidadSlug | "";
  experiencia: ExperienciaSlug | "";
  educacion: EducacionSlug | "";
  vacantes: number | null;
  distrito: string;
};

/** Sueldo en número para filtrar y ordenar: "S/ 1,500 a 2,000" → 1500. "A tratar" → null. */
function sueldoNumero(data: Record<string, unknown>): number | null {
  if (data.sueldo_min != null && data.sueldo_min !== "") return Number(data.sueldo_min) || null;
  const m = String(data.sueldo ?? "").replace(/,(?=\d{3})/g, "").match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

const texto = (v: unknown) => (v == null ? "" : String(v).trim());

function toOferta({ slug, data, body }: { slug: string; data: Record<string, unknown>; body: string }): Oferta {
  return {
    sueldoMin: sueldoNumero(data),
    jornada: texto(data.jornada) as Oferta["jornada"],
    modalidad: (texto(data.modalidad) || "presencial") as Oferta["modalidad"],
    experiencia: texto(data.experiencia) as Oferta["experiencia"],
    educacion: texto(data.educacion) as Oferta["educacion"],
    vacantes: data.vacantes != null && data.vacantes !== "" ? Number(data.vacantes) || null : null,
    distrito: texto(data.distrito),
    slug,
    title: String(data.title),
    empresa: String(data.empresa ?? ""),
    categoria: data.categoria as CategoriaSlug,
    provincia: data.provincia as ProvinciaSlug,
    date: toDate(data.date),
    vence: toDate(data.vence),
    sueldo: String(data.sueldo ?? "A tratar"),
    fuente: String(data.fuente ?? ""),
    origen: texto(data.origen),
    // Solo rutas locales del sitio (nunca una imagen de otro dominio)
    logo: /^\/img\/empresas\/[\w.-]+$/.test(texto(data.logo)) ? texto(data.logo) : "",
    resumen: String(data.resumen ?? ""),
    html: marked.parse(body) as string,
  };
}

/** Página de muestra hecha con content/_plantilla-oferta.md (no aparece en listados, en Google ni en el panel). */
export function getOfertaEjemplo(): Oferta {
  const raw = fs.readFileSync(path.join(CONTENT, "_plantilla-oferta.md"), "utf8");
  const { data, content } = matter(raw);
  return toOferta({ slug: "ejemplo", data, body: content });
}

export function getOfertas(): Oferta[] {
  return readDir("ofertas")
    .map(toOferta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const getOferta = (slug: string) => getOfertas().find((o) => o.slug === slug);

/* ---------- Páginas fijas (Sobre nosotros, Privacidad...) ---------- */

export function getPagina(slug: string) {
  const p = readDir("paginas").find((x) => x.slug === slug);
  if (!p) return undefined;
  return {
    slug,
    title: String(p.data.title),
    description: String(p.data.description ?? ""),
    html: marked.parse(p.body) as string,
  };
}

export const getPaginas = () => readDir("paginas").map((p) => p.slug);

/* ---------- Utilidades ---------- */

/** Fecha de hoy en hora de Lima, al compilar (el sitio se vuelve a compilar con cada importe) */
export const hoyLima = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });

/** ¿Venció hace más de `dias` días? Esas ofertas dejan de ofrecerse a Google (su página sigue existiendo) */
export const vencidaHace = (o: { vence: string }, dias: number) =>
  Boolean(o.vence) && Date.parse(hoyLima()) - Date.parse(o.vence) > dias * 86_400_000;

export function formatFecha(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
