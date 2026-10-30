import Link from "next/link";
import { categorias, site } from "@/site.config";
import { alertasActivas } from "@/lib/alertas";

// Lo que más se busca en Google (llevan a las páginas de tipo de trabajo + provincia)
const FRECUENTES = [
  ["/empleos/convocatorias-del-estado/ica/", "Convocatorias CAS en Ica"],
  ["/empleos/practicas/ica/", "Prácticas en Ica"],
  ["/empleos/agroexportacion/chincha/", "Agroexportación en Chincha"],
  ["/empleos/empleos-en-empresas/pisco/", "Trabajo en Pisco"],
  ["/empleos/convocatorias-del-estado/nasca/", "Convocatorias CAS en Nasca"],
] as const;

export default function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <div className="pie-grid">
          <div>
            <h3 className="pie-marca">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icono.svg" alt="" width={32} height={32} />
              {site.name}
            </h3>
            <p>Convocatorias y ofertas de trabajo en Ica, Chincha, Pisco, Nasca y Palpa, verificadas y explicadas paso a paso.</p>
            <p className="pie-aviso">
              <strong>Nunca cobramos por postular.</strong> Si te piden dinero por un puesto, es estafa.
            </p>
          </div>
          <div>
            <h3>Empleos</h3>
            <ul>
              {categorias.map((c) => (
                <li key={c.slug}>
                  <Link href={`/empleos/${c.slug}/`}>{c.nombre}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Búsquedas frecuentes</h3>
            <ul>
              {FRECUENTES.map(([href, texto]) => (
                <li key={href}><Link href={href}>{texto}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Información</h3>
            <ul>
              <li><Link href="/guias/">Guías para postular</Link></li>
              {alertasActivas() && <li><Link href="/alertas/">Alertas por correo</Link></li>}
              <li><Link href="/sobre-nosotros/">Sobre nosotros</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
              <li><Link href="/politica-de-privacidad/">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>
        <p className="pie-copy">© {new Date().getFullYear()} {site.name} · Hecho por AdresDEV, Perú</p>
      </div>
    </footer>
  );
}
