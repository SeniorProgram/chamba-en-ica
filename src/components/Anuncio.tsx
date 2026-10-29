"use client";

import { useEffect } from "react";

const CLIENTE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Espacio para un anuncio de Google AdSense.
 * No muestra nada hasta que configures NEXT_PUBLIC_ADSENSE_CLIENT (ver README).
 */
export default function Anuncio({ slot }: { slot?: string }) {
  useEffect(() => {
    if (!CLIENTE) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* el script de AdSense aún no cargó */
    }
  }, []);

  if (!CLIENTE) return null;

  return (
    <div className="anuncio">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENTE}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
