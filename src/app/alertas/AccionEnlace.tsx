"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icono } from "@/components/OfertaCard";

/**
 * Confirmar la alerta o darse de baja desde el enlace del correo.
 * Confirmar se hace solo al abrir la página; la baja pide pulsar un botón (los antivirus del correo
 * abren los enlaces para revisarlos y no deben dar de baja a nadie por accidente).
 */
export default function AccionEnlace({ accion }: { accion: "confirmar" | "baja" }) {
  const t = useSearchParams().get("t") ?? "";
  const [estado, setEstado] = useState<"" | "enviando" | "listo" | "error">("");
  const [mensaje, setMensaje] = useState("");
  const hecho = useRef(false);

  const ejecutar = async () => {
    setEstado("enviando");
    try {
      const res = await fetch(`/api/alertas/${accion}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || "Algo falló. Prueba en unos minutos.");
      setEstado("listo");
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "Algo falló.");
      setEstado("error");
    }
  };

  useEffect(() => {
    if (accion !== "confirmar" || hecho.current) return;
    hecho.current = true;
    if (t) ejecutar(); else { setMensaje("Falta el código del enlace. Ábrelo tal como llegó a tu correo."); setEstado("error"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (estado === "error") {
    return (
      <div className="panel alerta-lista" role="alert">
        <Icono nombre="alerta" tam={32} />
        <h2>No se pudo completar</h2>
        <p>{mensaje}</p>
        <Link href="/alertas/" className="btn btn-contorno">Crear una alerta</Link>
      </div>
    );
  }
  if (estado === "listo") {
    return accion === "confirmar" ? (
      <div className="panel alerta-lista" role="status">
        <Icono nombre="check" tam={32} />
        <h2>¡Tu alerta está activa!</h2>
        <p>Desde mañana te escribimos cuando haya ofertas nuevas que coincidan con lo que elegiste. Agrega nuestro correo a tus contactos para que no se vaya a spam.</p>
        <Link href="/empleos/" className="btn btn-naranja">Ver las ofertas de hoy</Link>
      </div>
    ) : (
      <div className="panel alerta-lista" role="status">
        <Icono nombre="check" tam={32} />
        <h2>Listo, ya no recibirás alertas</h2>
        <p>Borramos tu correo de las alertas. Si cambias de opinión, puedes crear una nueva cuando quieras.</p>
        <Link href="/alertas/" className="btn btn-contorno">Crear una alerta nueva</Link>
      </div>
    );
  }
  if (accion === "confirmar") {
    return <div className="panel alerta-lista" role="status"><p>Activando tu alerta...</p></div>;
  }
  return (
    <div className="panel alerta-lista">
      <Icono nombre="correo" tam={32} />
      <h2>¿Dejar de recibir alertas?</h2>
      <p>Ya no te llegarán correos con ofertas nuevas.</p>
      <button type="button" className="btn btn-naranja" onClick={ejecutar} disabled={estado === "enviando" || !t}>
        {estado === "enviando" ? "Dando de baja..." : "Sí, darme de baja"}
      </button>
    </div>
  );
}
