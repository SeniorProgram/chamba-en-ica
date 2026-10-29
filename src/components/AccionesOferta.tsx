"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { site } from "@/site.config";
import { Icono, useGuardadas } from "./OfertaCard";

/** Reportar, compartir y guardar (botones redondos en la cabecera de la oferta) */
export function AccionesOferta({ slug, titulo }: { slug: string; titulo: string }) {
  const [guardadas, guardar] = useGuardadas();
  const [aviso, setAviso] = useState("");
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const guardada = guardadas.includes(slug);

  const mostrar = (texto: string) => {
    setAviso(texto);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(""), 2200);
  };
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const compartir = async () => {
    const url = window.location.href.split("#")[0];
    // En el celular abre el menú de compartir (WhatsApp, Facebook...); en la computadora copia el enlace
    if (navigator.share) {
      try { await navigator.share({ title: titulo, text: `${titulo} – Chamba en Ica`, url }); } catch { /* lo canceló */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); mostrar("Enlace copiado"); } catch { mostrar("No se pudo copiar el enlace"); }
  };

  // Abre el correo con el enlace de la oferta ya escrito
  const reportar = () => {
    const cuerpo = `Quiero reportar esta oferta: ${window.location.href.split("#")[0]}\n\nMotivo (vencida, datos falsos, piden dinero...):\n`;
    window.location.href = `mailto:${site.contactEmail}?subject=${encodeURIComponent(`Reportar oferta: ${titulo}`)}&body=${encodeURIComponent(cuerpo)}`;
  };

  return (
    <div className="acciones-redondas">
      <button type="button" className="accion-redonda" onClick={reportar} title="Reportar un problema con esta oferta" aria-label="Reportar oferta">
        <Icono nombre="alerta" tam={21} />
      </button>
      <button type="button" className="accion-redonda" onClick={compartir} title="Compartir" aria-label="Compartir oferta">
        <Icono nombre="compartir" tam={21} />
      </button>
      <button
        type="button"
        className="accion-redonda accion-guardar"
        onClick={() => { guardar(slug); mostrar(guardada ? "Quitada de tus guardadas" : "Guardada en tus ofertas"); }}
        aria-pressed={guardada}
        title={guardada ? "Quitar de guardadas" : "Guardar oferta"}
        aria-label={guardada ? "Quitar de guardadas" : "Guardar oferta"}
      >
        <Icono nombre="corazon" tam={21} />
      </button>
      <span className={`toast ${aviso ? "visible" : ""}`} role="status">{aviso}</span>
    </div>
  );
}

/** Pestañas "Detalle del empleo" / "Ofertas relacionadas" (las dos quedan en la página para Google) */
export function PestanasOferta({ detalle, relacionadas, total }: { detalle: ReactNode; relacionadas: ReactNode; total: number }) {
  const [activa, setActiva] = useState<"detalle" | "relacionadas">("detalle");
  const pestanas = [
    { id: "detalle" as const, texto: "Detalle del empleo" },
    { id: "relacionadas" as const, texto: `Empleos relacionados${total ? ` (${total})` : ""}` },
  ];
  return (
    <>
      <div className="pestanas panel" role="tablist" aria-label="Contenido de la oferta">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            id={`pestana-${p.id}`}
            aria-selected={activa === p.id}
            aria-controls={`panel-${p.id}`}
            onClick={() => setActiva(p.id)}
          >
            {p.texto}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel-detalle" aria-labelledby="pestana-detalle" hidden={activa !== "detalle"}>{detalle}</div>
      <div role="tabpanel" id="panel-relacionadas" aria-labelledby="pestana-relacionadas" hidden={activa !== "relacionadas"}>{relacionadas}</div>
    </>
  );
}
