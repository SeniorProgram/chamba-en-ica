"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { categorias, provincias } from "@/site.config";
import { Icono } from "@/components/OfertaCard";

/** Formulario para crear una alerta: correo + tipos de trabajo + provincias (vacío = todos) */
export default function FormularioAlertas() {
  // Si viene desde una página de empleos, llega con su tipo y provincia ya marcados (?cat=practicas&prov=chincha)
  const params = useSearchParams();
  const inicial = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const [cats, setCats] = useState<string[]>(() => inicial("cat"));
  const [provs, setProvs] = useState<string[]>(() => inicial("prov"));
  const [estado, setEstado] = useState<"" | "enviando" | "listo" | "error">("");
  const [mensaje, setMensaje] = useState("");
  const [correo, setCorreo] = useState("");

  const alternar = (lista: string[], set: (v: string[]) => void, slug: string) =>
    set(lista.includes(slug) ? lista.filter((s) => s !== slug) : [...lista, slug]);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setEstado("enviando");
    try {
      const res = await fetch("/api/alertas/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: datos.get("email"), cats, provs, web: datos.get("web") }),
      });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || "No pudimos crear tu alerta. Prueba en unos minutos.");
      setCorreo(String(datos.get("email")));
      setEstado("listo");
    } catch (err) {
      setMensaje(err instanceof Error ? err.message : "No pudimos crear tu alerta.");
      setEstado("error");
    }
  }

  if (estado === "listo") {
    return (
      <div className="panel alerta-lista" role="status">
        <Icono nombre="correo" tam={32} />
        <h2>¡Revisa tu correo!</h2>
        <p>
          Te enviamos un mensaje a <strong>{correo}</strong>. Pulsa <strong>Activar mis alertas</strong> para empezar a
          recibir las ofertas nuevas. Si no lo ves en unos minutos, revisa la carpeta de <strong>spam</strong> o
          <strong> promociones</strong>.
        </p>
        <Link href="/empleos/" className="btn btn-contorno">Seguir viendo ofertas</Link>
      </div>
    );
  }

  return (
    <form className="form-oferta form-alertas" onSubmit={enviar}>
      {/* Campo trampa contra robots: invisible para las personas */}
      <input type="text" name="web" tabIndex={-1} autoComplete="off" className="trampa" aria-hidden />

      <fieldset>
        <legend>1. ¿Qué trabajo buscas?</legend>
        <p className="nota-form">Marca uno o varios. Si no marcas ninguno, te avisamos de todos.</p>
        <div className="opciones-chips">
          {categorias.map((c) => (
            <label key={c.slug} className={cats.includes(c.slug) ? "activo" : ""}>
              <input type="checkbox" checked={cats.includes(c.slug)} onChange={() => alternar(cats, setCats, c.slug)} />
              <span aria-hidden>{c.icono}</span> {c.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>2. ¿Dónde?</legend>
        <p className="nota-form">Si no marcas ninguna provincia, te avisamos de toda la región Ica.</p>
        <div className="opciones-chips">
          {provincias.map((p) => (
            <label key={p.slug} className={provs.includes(p.slug) ? "activo" : ""}>
              <input type="checkbox" checked={provs.includes(p.slug)} onChange={() => alternar(provs, setProvs, p.slug)} />
              {p.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>3. Tu correo</legend>
        <div className="campos">
          <label className="ancho">Correo electrónico *
            <input name="email" type="email" required maxLength={200} autoComplete="email" inputMode="email" placeholder="tucorreo@gmail.com" />
          </label>
        </div>
        <p className="nota-form" style={{ marginTop: 12, marginBottom: 0 }}>
          Te escribimos solo cuando hay ofertas nuevas, como máximo un correo al día. Puedes darte de baja cuando
          quieras con el enlace de cada correo. Más detalles en la <Link href="/politica-de-privacidad/">política de privacidad</Link>.
        </p>
      </fieldset>

      {estado === "error" && <p className="error-form" role="alert">{mensaje}</p>}
      <button className="btn btn-naranja enviar-oferta" type="submit" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Creando tu alerta..." : "Crear mi alerta gratis"}
      </button>
    </form>
  );
}
