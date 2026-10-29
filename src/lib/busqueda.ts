import type { Guia, Oferta } from "./content";
import { categorias, jornadas, modalidades, provincias } from "@/site.config";

/** Lo mínimo de cada oferta que necesita el buscador en el navegador (sin el HTML completo). */
export type OfertaBusqueda = Omit<Oferta, "html"> & { texto: string };
export type GuiaBusqueda = { slug: string; title: string; description: string; texto: string };

const sinEtiquetas = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export function aOfertaBusqueda({ html, ...o }: Oferta): OfertaBusqueda {
  // Texto donde se busca la palabra clave: título, empresa, resumen, lugar, categoría, jornada y el cuerpo del aviso
  // (así "prácticas", "pisco" o "remoto" encuentran la oferta aunque no lo diga el título)
  const nombre = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre ?? "";
  const etiquetas = [nombre(categorias, o.categoria), nombre(provincias, o.provincia), nombre(jornadas, o.jornada), nombre(modalidades, o.modalidad)].join(" ");
  return { ...o, texto: `${o.title} ${o.empresa} ${o.resumen} ${o.distrito} ${etiquetas} ${sinEtiquetas(html)}`.slice(0, 4000) };
}

export function aGuiaBusqueda(g: Guia): GuiaBusqueda {
  return { slug: g.slug, title: g.title, description: g.description, texto: `${g.title} ${g.description} ${sinEtiquetas(g.html)}` };
}
