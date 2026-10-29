"use client";

import { useState } from "react";
import { categorias, educaciones, experiencias, jornadas, modalidades, provincias, site } from "@/site.config";

// Clave pública de Web3Forms (https://web3forms.com): manda cada oferta a tu correo.
// Sin clave, el formulario abre el correo de quien publica con todo ya escrito.
const CLAVE = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;

type Datos = Record<string, string>;
const nombre = (lista: readonly { slug: string; nombre: string }[], v: string) => lista.find((x) => x.slug === v)?.nombre ?? v;

/** Ficha lista para pegar en el panel o pedírsela a Claude ("crea esta oferta"). */
function ficha(d: Datos) {
  const l = (t: string, v?: string) => (v?.trim() ? `${t}: ${v.trim()}` : "");
  return [
    "OFERTA ENVIADA DESDE EL FORMULARIO",
    l("Puesto", d.puesto), l("Empresa", d.empresa), l("RUC", d.ruc),
    l("Categoría", nombre(categorias, d.categoria)), l("Provincia", nombre(provincias, d.provincia)), l("Distrito", d.distrito),
    l("Jornada", nombre(jornadas, d.jornada)), l("Modalidad", nombre(modalidades, d.modalidad)),
    l("Experiencia", nombre(experiencias, d.experiencia)), l("Estudios", nombre(educaciones, d.educacion)),
    l("Sueldo", d.sueldo), l("Vacantes", d.vacantes), l("Postular hasta", d.vence), l("Enlace oficial", d.enlace),
    "", "REQUISITOS", d.requisitos ?? "", "", "FUNCIONES", d.funciones ?? "", "", "CÓMO POSTULAR", d.postular ?? "",
    "", "CONTACTO (no se publica)", l("Nombre", d.contacto), l("Correo", d.correo), l("Teléfono/WhatsApp", d.telefono),
  ].filter((x, i, a) => x !== "" || a[i - 1] !== "").join("\n");
}

export default function FormularioOferta() {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | "error">("");
  const [mensaje, setMensaje] = useState("");

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form).entries()) as Datos;
    if (d.botcheck) return; // campo trampa: lo llenan los robots, no las personas
    const asunto = `Nueva oferta: ${d.puesto} – ${d.empresa}`;
    const texto = ficha(d);

    if (!CLAVE) {
      // Sin servicio configurado: se abre el correo con todo listo para enviar
      window.location.href = `mailto:${site.contactEmail}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(texto)}`;
      setEstado("ok");
      setMensaje("Se abrió tu correo con la oferta ya escrita. Solo pulsa Enviar.");
      return;
    }
    setEstado("enviando");
    try {
      const r = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: CLAVE,
          subject: asunto,
          from_name: `${d.empresa} (Chamba en Ica)`,
          replyto: d.correo,
          Oferta: texto,
        }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      form.reset();
      setEstado("ok");
      setMensaje("¡Gracias! Recibimos tu oferta. La revisaremos y, si cumple los requisitos, la publicaremos en 1 o 2 días.");
    } catch {
      setEstado("error");
      setMensaje(`No se pudo enviar. Inténtalo de nuevo o escríbenos a ${site.contactEmail}.`);
    }
  }

  if (estado === "ok") {
    return (
      <div className="vacio" role="status" style={{ marginBottom: 72 }}>
        <p style={{ fontSize: 40, margin: 0 }}>✅</p>
        <p><strong>{mensaje}</strong></p>
        <button type="button" className="btn btn-contorno" onClick={() => setEstado("")}>Publicar otra oferta</button>
      </div>
    );
  }

  return (
    <form className="form-oferta" onSubmit={enviar}>
      {/* Campo trampa contra robots: invisible para las personas */}
      <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" className="trampa" aria-hidden />

      <fieldset>
        <legend>1. La oferta</legend>
        <div className="campos">
          <label className="ancho">Puesto *<input name="puesto" required maxLength={120} placeholder="Ej.: Cajero de tienda" /></label>
          <label>Categoría *
            <select name="categoria" required defaultValue="">
              <option value="" disabled>Elige una</option>
              {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nombre}</option>)}
            </select>
          </label>
          <label>Provincia *
            <select name="provincia" required defaultValue="">
              <option value="" disabled>Elige una</option>
              {provincias.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}
            </select>
          </label>
          <label>Distrito o zona<input name="distrito" maxLength={80} placeholder="Ej.: Parcona" /></label>
          <label>Jornada
            <select name="jornada" defaultValue="">
              <option value="">No indica</option>
              {jornadas.map((j) => <option key={j.slug} value={j.slug}>{j.nombre}</option>)}
            </select>
          </label>
          <label>Modalidad
            <select name="modalidad" defaultValue="presencial">
              {modalidades.map((m) => <option key={m.slug} value={m.slug}>{m.nombre}</option>)}
            </select>
          </label>
          <label>Experiencia
            <select name="experiencia" defaultValue="">
              <option value="">No indica</option>
              {experiencias.map((x) => <option key={x.slug} value={x.slug}>{x.nombre}</option>)}
            </select>
          </label>
          <label>Estudios
            <select name="educacion" defaultValue="">
              <option value="">No indica</option>
              {educaciones.map((x) => <option key={x.slug} value={x.slug}>{x.nombre}</option>)}
            </select>
          </label>
          <label>Sueldo *<input name="sueldo" required maxLength={60} placeholder="Ej.: S/ 1,500 o A tratar" /></label>
          <label>Vacantes<input name="vacantes" type="number" min={1} max={999} placeholder="1" /></label>
          <label>Último día para postular<input name="vence" type="date" /></label>
          <label className="ancho">Requisitos *<textarea name="requisitos" required rows={4} maxLength={2000} placeholder={"Uno por línea. Ej.:\nSecundaria completa\nDisponibilidad de lunes a sábado"} /></label>
          <label className="ancho">Funciones<textarea name="funciones" rows={3} maxLength={2000} placeholder="¿Qué hará la persona?" /></label>
          <label className="ancho">Cómo postular *<textarea name="postular" required rows={3} maxLength={1000} placeholder="Ej.: Enviar CV a rrhh@empresa.com con el asunto 'Cajero' o acercarse a Av. ..." /></label>
          <label className="ancho">Enlace oficial de la oferta (si tiene)<input name="enlace" type="url" maxLength={300} placeholder="https://..." /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend>2. Empresa y contacto</legend>
        <p className="nota-form">Tus datos de contacto <strong>no se publican</strong>: los usamos solo para verificar la oferta.</p>
        <div className="campos">
          <label className="ancho">Empresa o entidad *<input name="empresa" required maxLength={120} /></label>
          <label>RUC<input name="ruc" inputMode="numeric" pattern="\d{11}" maxLength={11} placeholder="11 dígitos" /></label>
          <label>Tu nombre *<input name="contacto" required maxLength={80} autoComplete="name" /></label>
          <label>Correo *<input name="correo" type="email" required maxLength={120} autoComplete="email" /></label>
          <label>Teléfono o WhatsApp<input name="telefono" type="tel" maxLength={20} autoComplete="tel" /></label>
        </div>
      </fieldset>

      <label className="declaro">
        <input type="checkbox" required />
        <span>Declaro que la oferta es real y que <strong>no se cobrará nada</strong> a quienes postulen.</span>
      </label>

      {estado === "error" && <p className="error-form" role="alert">{mensaje}</p>}
      <button className="btn btn-naranja enviar-oferta" type="submit" disabled={estado === "enviando"}>
        {estado === "enviando" ? "Enviando..." : "Enviar oferta para revisión"}
      </button>
      <p className="nota-form centro">Publicar es gratis. Revisamos cada oferta antes de publicarla.</p>
    </form>
  );
}
