/** @type {import('next').NextConfig} */
const nextConfig = {
  // Las páginas se generan al compilar (ofertas, guías, categorías); además hay un endpoint
  // con servidor para el verificador con IA (src/app/api/verificar). Se publica en Vercel.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
