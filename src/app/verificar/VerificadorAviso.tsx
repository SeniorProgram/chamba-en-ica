"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LIMITE_TEXTO, MINIMO_TEXTO, revisarBasico, type ResultadoVerificacion } from "@/lib/verificar";
import { Icono } from "@/components/OfertaCard";

const EJEMPLO = `🔥 ¡¡TRABAJO URGENTE EN ICA!! 🔥
Se necesita personal para almacén, sin experiencia. Sueldo S/ 3,800 + bonos.
Solo debes pagar S/ 60 por la capacitación y el fotocheck.
Envía foto de tu DNI por ambos lados al WhatsApp 987 654 321. ¡Últimos cupos!`;

const NIVELES = {
  alto: { texto: "Riesgo alto", clase: "riesgo-alto" },
  medio: { texto: "Riesgo medio", clase: "riesgo-medio" },
  bajo: { texto: "Riesgo bajo", clase: "riesgo-bajo" },
} as const;

export default function VerificadorAviso() {
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoVerificacion | null>(null);
  const [conIA, setConIA] = useState(false);
  const [avisoIA, setAvisoIA] = useState("");
  const resultadoRef = useRef<HTMLDivElement>(null);

  const revisar = async (e: React.FormEvent) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (limpio.length < MINIMO_TEXTO) return;
    // Primero la revisión básica (inmediata, sin IA); luego se intenta el análisis con IA
    setResultado(revisarBasico(limpio));
    setConIA(false);
    setAvisoIA("");
    setCargando(true);
    requestAnimationFrame(() => resultadoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      const r = await fetch("/api/verificar/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: limpio }),
      });
      const datos = await r.json().catch(() => ({}));
      if (r.ok) {
        setResultado(datos as ResultadoVerificacion);
        setConIA(true);
      } else {
        setAvisoIA(datos?.error ?? "El análisis con IA no está disponible ahora.");
      }
    } catch {
      setAvisoIA("No hay conexión para el análisis con IA.");
    } finally {
      setCargando(false);
    }
  };

  const nivel = resultado ? NIVELES[resultado.nivel] : null;
  const corto = texto.trim().length < MINIMO_TEXTO;

  return (
    <div className="verificador">
      <form className="panel panel-articulo verificador-form" onSubmit={revisar}>
        <label htmlFor="aviso" className="verificador-etiqueta">Pega aquí el aviso de trabajo</label>
        <textarea
          id="aviso"
          value={texto}
          onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_TEXTO))}
          rows={9}
          placeholder="Copia el mensaje completo tal como te llegó por WhatsApp, Facebook o TikTok…"
        />
        <div className="verificador-pie">
          <span className="muted">{texto.length.toLocaleString("es-PE")} / {LIMITE_TEXTO.toLocaleString("es-PE")}</span>
          <button type="button" className="enlace-btn" onClick={() => setTexto(EJEMPLO)}>Probar con un ejemplo</button>
        </div>
        <button className="btn btn-naranja verificador-boton" type="submit" disabled={corto || cargando}>
          <Icono nombre="escudo" /> {cargando ? "Revisando…" : "Revisar aviso"}
        </button>
        <p className="verificador-privacidad">
          No guardamos lo que pegas. Antes de enviarlo, puedes borrar tu nombre o teléfono si aparecen.
        </p>
      </form>

      <div ref={resultadoRef} className="verificador-resultado" aria-live="polite">
        {resultado && nivel && (
          <article className={`panel panel-articulo resultado ${nivel.clase}`}>
            <div className="resultado-cab">
              {resultado.esOferta ? <span className="nivel-badge">{nivel.texto}</span> : <span className="nivel-badge nivel-neutro">No parece un aviso</span>}
              <span className="oc-fecha">
                {conIA ? "Análisis con IA" : cargando ? "Revisión básica · analizando con IA…" : "Revisión básica"}
              </span>
            </div>
            <p className="resultado-resumen">{resultado.resumen}</p>

            {resultado.senales.length > 0 && (
              <>
                <h2 className="resultado-titulo">Señales de alerta</h2>
                <ul className="lista-senales">
                  {resultado.senales.map((s, i) => (
                    <li key={i} className={`senal senal-${s.gravedad}`}>
                      <Icono nombre="alerta" />
                      <div><strong>{s.titulo}</strong><span>{s.detalle}</span></div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {resultado.positivas.length > 0 && (
              <>
                <h2 className="resultado-titulo">Lo que da confianza</h2>
                <ul className="lista-check">
                  {resultado.positivas.map((p, i) => <li key={i}><Icono nombre="check" /> {p}</li>)}
                </ul>
              </>
            )}

            {resultado.recomendaciones.length > 0 && (
              <>
                <h2 className="resultado-titulo">Qué hacer</h2>
                <ol className="lista-pasos-simple">
                  {resultado.recomendaciones.map((r, i) => <li key={i}>{r}</li>)}
                </ol>
              </>
            )}

            {avisoIA && <p className="resultado-nota">{avisoIA} Te mostramos la revisión básica, que busca las señales de estafa más comunes.</p>}
            <p className="resultado-nota">
              Es una orientación y no reemplaza tu propia verificación. Conoce las 8 señales en{" "}
              <Link href="/guias/como-detectar-ofertas-de-trabajo-falsas/">cómo detectar ofertas falsas</Link>.
            </p>
          </article>
        )}
      </div>
    </div>
  );
}
