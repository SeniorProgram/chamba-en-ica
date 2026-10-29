import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  /** Ruta de migas sin "Inicio" (se agrega solo). El último elemento va sin enlace. */
  migas?: { href?: string; texto: string }[];
  titulo?: ReactNode;
  descripcion?: ReactNode;
  children?: ReactNode;
};

/** Cabecera compacta de cada página: migas, título y descripción, alineados a la izquierda. */
export default function Cabecera({ migas = [], titulo, descripcion, children }: Props) {
  return (
    <header className="pagina-cab">
      <nav className="migas entrada" aria-label="Ruta">
        <Link href="/">Inicio</Link>
        {migas.map((m) => (
          <span key={m.texto}>
            <span aria-hidden className="migas-sep">›</span>
            {m.href ? <Link href={m.href}>{m.texto}</Link> : <span aria-current="page">{m.texto}</span>}
          </span>
        ))}
      </nav>
      {titulo && <h1 className="entrada entrada-2">{titulo}</h1>}
      {descripcion && <p className="muted entrada entrada-2">{descripcion}</p>}
      {children}
    </header>
  );
}
