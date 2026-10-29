import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="pagina">
      <div className="contenedor angosto" style={{ padding: "72px 16px" }}>
        <div className="panel panel-articulo centro">
          <p className="error-icono entrada" aria-hidden>🔎</p>
          <h1 className="entrada">Página no encontrada</h1>
          <p className="muted entrada entrada-2">Puede que la oferta haya sido retirada o que el enlace tenga un error.</p>
          <p className="entrada entrada-3">
            <Link href="/empleos/" className="btn btn-naranja">Ver ofertas</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
