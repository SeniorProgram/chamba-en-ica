import type { MetadataRoute } from "next";
import { categorias, provincias, site } from "@/site.config";
import { getGuias, getOfertas, getPaginas, vencidaHace } from "@/lib/content";
import { combinaciones, paginaEmpleo } from "@/lib/paginas-empleo";
import { alertasActivas } from "@/lib/alertas";

export const dynamic = "force-static";

// Mapa del sitio para Google (se genera en /sitemap.xml)
export default function sitemap(): MetadataRoute.Sitemap {
  const u = (p: string) => `${site.url}${p}`;
  const ofertas = getOfertas();
  return [
    { url: u("/"), changeFrequency: "daily", priority: 1 },
    { url: u("/empleos/"), changeFrequency: "daily" },
    { url: u("/guias/"), changeFrequency: "weekly" },
    ...(alertasActivas() ? [{ url: u("/alertas/") }] : []),
    { url: u("/contacto/") },
    ...getPaginas().filter((s) => s !== "contacto").map((s) => ({ url: u(`/${s}/`) })),
    ...categorias.map((c) => ({ url: u(`/empleos/${c.slug}/`), changeFrequency: "daily" as const })),
    ...provincias.map((p) => ({ url: u(`/provincia/${p.slug}/`), changeFrequency: "daily" as const })),
    // Tipo de trabajo + provincia, solo las que tienen o tuvieron ofertas
    ...combinaciones()
      .filter((c) => paginaEmpleo(ofertas, c.categoria, c.provincia)?.total)
      .map((c) => ({ url: u(`/empleos/${c.categoria}/${c.provincia}/`), changeFrequency: "daily" as const })),
    ...getGuias().map((g) => ({ url: u(`/guias/${g.slug}/`), lastModified: g.updated })),
    // Las que vencieron hace más de 30 días ya no se ofrecen a Google
    ...ofertas.filter((o) => !vencidaHace(o, 30)).map((o) => ({ url: u(`/ofertas/${o.slug}/`), lastModified: o.date })),
  ];
}
