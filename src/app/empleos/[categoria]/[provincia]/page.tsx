import type { Metadata } from "next";
import Link from "next/link";
import { getOfertas } from "@/lib/content";
import { combinaciones, paginaEmpleo } from "@/lib/paginas-empleo";
import ListaOfertas from "@/components/ListaOfertas";

type Props = { params: Promise<{ categoria: string; provincia: string }> };

export const dynamicParams = false;

// Una página por tipo de trabajo y provincia: /empleos/practicas/chincha/, /empleos/agroexportacion/pisco/...
export function generateStaticParams() {
  return combinaciones();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria, provincia } = await params;
  const p = paginaEmpleo(getOfertas(), categoria, provincia)!;
  return {
    title: `${p.titulo}${p.abiertas ? ` (${p.abiertas} ofertas)` : ""}`,
    description: p.descripcion,
    // Si nunca hubo ofertas de este tipo en la provincia, la página no se ofrece a Google (quedaría vacía)
    robots: p.total ? undefined : { index: false, follow: true },
  };
}

export default async function TipoEnProvincia({ params }: Props) {
  const { categoria, provincia } = await params;
  const p = paginaEmpleo(getOfertas(), categoria, provincia)!;
  const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs.at(-1)}` : xs[0]);

  return (
    <ListaOfertas
      titulo={`${p.cat.icono} ${p.titulo}`}
      descripcion={p.descripcion}
      fijo={{ cat: p.cat.slug, prov: p.prov.slug }}
      pie={
        <section className="panel seo-empleo" aria-labelledby="seo-empleo-titulo">
          <h2 id="seo-empleo-titulo">{p.titulo}: lo que debes saber</h2>
          <p>
            {p.abiertas
              ? <>Al último corte había <strong>{p.abiertas} {p.abiertas === 1 ? "oferta abierta" : "ofertas abiertas"}</strong> de {p.cat.nombre.toLowerCase()} en la provincia de {p.prov.nombre}. </>
              : <>En este momento no hay ofertas abiertas de {p.cat.nombre.toLowerCase()} en la provincia de {p.prov.nombre}; revisa seguido, porque publicamos ofertas nuevas cada día. </>}
            {p.empresas.length > 0 && <>Aquí han publicado {lista(p.empresas)}. </>}
            Todas las ofertas vienen de fuentes oficiales o de las mismas empresas, y postular siempre es gratis.
          </p>
          <p>{p.consejo}</p>
          <p>
            Te puede servir: <Link href={`/guias/${p.guia.slug}/`}>{p.guia.texto}</Link>. ¿Te llegó un aviso por WhatsApp o
            Facebook? <Link href="/verificar/">Verifica si es confiable</Link> antes de enviar tus datos.
          </p>
        </section>
      }
    />
  );
}
