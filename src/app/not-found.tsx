import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="contenedor angosto centro" style={{ padding: "96px 16px" }}>
      <h1 className="entrada">Página no encontrada</h1>
      <p className="muted entrada entrada-2">Puede que la oferta haya sido retirada o que el enlace tenga un error.</p>
      <p className="entrada entrada-3">
        <Link href="/empleos/" className="btn btn-naranja">Ver ofertas</Link>
      </p>
    </div>
  );
}
