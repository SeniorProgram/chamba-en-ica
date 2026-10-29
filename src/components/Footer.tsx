import Link from "next/link";
import { categorias, site } from "@/site.config";

export default function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <div className="pie-grid">
          <div>
            <h3>{site.name}</h3>
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
            <h3>Información</h3>
            <ul>
              <li><Link href="/guias/">Guías para postular</Link></li>
              <li><Link href="/sobre-nosotros/">Sobre nosotros</Link></li>
              <li><Link href="/contacto/">Contacto</Link></li>
              <li><Link href="/politica-de-privacidad/">Política de privacidad</Link></li>
            </ul>
          </div>
        </div>
        <p className="pie-copy">© {new Date().getFullYear()} {site.name} · Hecho en Ica, Perú</p>
      </div>
    </footer>
  );
}
