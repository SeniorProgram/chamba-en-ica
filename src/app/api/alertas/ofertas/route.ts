import { getOfertas } from "@/lib/content";

/**
 * Lista de ofertas para el envío de alertas. Se genera al compilar (cada vez que se publican ofertas nuevas),
 * así el envío diario no necesita leer los archivos del proyecto.
 */
export const dynamic = "force-static";

export type OfertaAlerta = {
  slug: string; title: string; empresa: string; categoria: string; provincia: string;
  distrito: string; sueldo: string; vence: string;
};

export function GET() {
  const ofertas: OfertaAlerta[] = getOfertas().map((o) => ({
    slug: o.slug, title: o.title, empresa: o.empresa, categoria: o.categoria, provincia: o.provincia,
    distrito: o.distrito, sueldo: o.sueldo, vence: o.vence,
  }));
  return Response.json(ofertas);
}
