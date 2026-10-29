"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export type Item = { tipo: "Oferta" | "Guía"; titulo: string; detalle: string; url: string; texto: string };

// Quita tildes y mayúsculas para que "práctica" encuentre "practica"
const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function Buscador({ items }: { items: Item[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const resultados = useMemo(() => {
    const palabras = normalizar(q).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    return items.filter((it) => {
      const t = normalizar(`${it.titulo} ${it.texto}`);
      return palabras.every((p) => t.includes(p));
    });
  }, [q, items]);

  return (
    <>
      <header className="cabecera-pagina centro">
        <h1 className="entrada">Buscar</h1>
        <form
          className="buscador entrada entrada-2"
          role="search"
          style={{ border: "1px solid var(--borde)" }}
          onSubmit={(e) => {
            e.preventDefault();
            router.replace(`/buscar/?q=${encodeURIComponent(q)}`);
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Puesto, empresa o palabra clave"
            aria-label="Buscar"
            autoFocus
          />
          <button className="btn btn-naranja" type="submit">Buscar</button>
        </form>
      </header>

      <section style={{ paddingBottom: 72 }}>
        {q.trim() === "" ? (
          <p className="muted centro">Escribe una palabra, por ejemplo: CAS, CTS, Pisco o practicante.</p>
        ) : resultados.length === 0 ? (
          <div className="vacio">
            <p>No encontramos resultados para “{q}”.</p>
            <p>Prueba con otra palabra o revisa todas las <Link href="/empleos/">ofertas</Link>.</p>
          </div>
        ) : (
          <>
            <p className="muted">
              {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
            </p>
            <div className="grilla" style={{ marginTop: 8 }}>
              {resultados.map((r) => (
                <Link key={r.url} href={r.url} className="tarjeta entrada">
                  <span className="badge">{r.tipo}</span>
                  <h3>{r.titulo}</h3>
                  <p>{r.detalle}</p>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
