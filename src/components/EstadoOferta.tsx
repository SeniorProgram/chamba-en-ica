"use client";

import { useEffect, useState } from "react";

/** Muestra si una oferta sigue vigente, comparando la fecha de vencimiento con el día de hoy. */
export default function EstadoOferta({ vence }: { vence: string }) {
  const [hoy, setHoy] = useState<string | null>(null);

  useEffect(() => {
    // Fecha de hoy en hora de Lima
    setHoy(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
  }, []);

  if (!vence) return <span className="badge">Sin fecha límite</span>;
  if (!hoy) return <span className="badge">Vence el {vence.split("-").reverse().join("/")}</span>;

  const dias = Math.round((Date.parse(vence) - Date.parse(hoy)) / 86_400_000);
  if (dias < 0) return <span className="badge badge-rojo">Vencida</span>;
  if (dias === 0) return <span className="badge badge-verde">Vence hoy</span>;
  return (
    <span className="badge badge-verde">
      Vigente · {dias === 1 ? "queda 1 día" : `quedan ${dias} días`}
    </span>
  );
}
