"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const enlaces = [
  { href: "/", label: "Inicio" },
  { href: "/empleos/", label: "Empleos" },
  { href: "/guias/", label: "Información" },
  { href: "/sobre-nosotros/", label: "Sobre nosotros" },
  { href: "/contacto/", label: "Contacto" },
];

export default function Header() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => setAbierto(false), [pathname]);

  const activo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="header">
      <div className="contenedor header-in">
        <Link href="/" className="logo" aria-label="Chamba en Ica, inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icono.svg" alt="" width={36} height={36} className="logo-icono" />
          <span className="logo-texto">Chamba<span> en </span>Ica</span>
        </Link>
        <button
          className="menu-btn"
          aria-label="Abrir menú"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? "✕" : "☰"}
        </button>
        <nav className={`nav ${abierto ? "abierto" : ""}`}>
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} aria-current={activo(e.href) ? "page" : undefined}>
              {e.label}
            </Link>
          ))}
          <Link href="/publica/" className="btn btn-contorno" aria-current={activo("/publica/") ? "page" : undefined}>
            Publica tu oferta
          </Link>
        </nav>
      </div>
    </header>
  );
}
