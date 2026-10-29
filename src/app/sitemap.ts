import type { MetadataRoute } from "next";
import { categorias, provincias, site } from "@/site.config";
import { getGuias, getOfertas, getPaginas } from "@/lib/content";

export const dynamic = "force-static";

// Mapa del sitio para Google (se genera en /sitemap.xml)
export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${site.url}${p}`;
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/empleos/"), changeFrequency: "daily" },
    { url: u("/guias/"), changeFrequency: "weekly" },
    { url: u("/contacto/") },
    ...getPaginas().filter((s) => s !== "contacto").map((s) => ({ url: u(`/${s}/`) })),
    ...categorias.map((c) => ({ url: u(`/empleos/${c.slug}/`), changeFrequency: "daily" as const })),
    ...provincias.map((p) => ({ url: u(`/provincia/${p.slug}/`), changeFrequency: "daily" as const })),
    ...getGuias().map((g) => ({ url: u(`/guias/${g.slug}/`), lastModified: g.updated })),
    ...getOfertas().map((o) => ({ url: u(`/ofertas/${o.slug}/`), lastModified: o.date })),
  ];
}
