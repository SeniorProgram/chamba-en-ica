import Link from "next/link";
import { categorias, provincias } from "@/site.config";
import { formatFecha, type Guia, type Oferta } from "@/lib/content";
import EstadoOferta from "./EstadoOferta";

export function TarjetaGuia({ guia, i = 0 }: { guia: Guia; i?: number }) {
  return (
    <Link href={`/guias/${guia.slug}/`} className="tarjeta revelar" style={{ "--retraso": `${i * 80}ms` } as React.CSSProperties}>
      <span className="badge">Guía</span>
      <h3>{guia.title}</h3>
      <p>{guia.description}</p>
      <div className="meta">Actualizado: {formatFecha(guia.updated)}</div>
    </Link>
  );
}

export function TarjetaOferta({ oferta, i = 0 }: { oferta: Oferta; i?: number }) {
  const cat = categorias.find((c) => c.slug === oferta.categoria);
  const prov = provincias.find((p) => p.slug === oferta.provincia);
  return (
    <Link href={`/ofertas/${oferta.slug}/`} className="tarjeta revelar" style={{ "--retraso": `${i * 80}ms` } as React.CSSProperties}>
      <EstadoOferta vence={oferta.vence} />
      <h3>{oferta.title}</h3>
      <p>{oferta.empresa}</p>
      <div className="meta">
        {cat?.icono} {cat?.nombre} · 📍 {prov?.nombre} · 💰 {oferta.sueldo}
      </div>
    </Link>
  );
}
