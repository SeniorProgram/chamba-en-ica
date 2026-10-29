/** @type {import('next').NextConfig} */
const nextConfig = {
  // Genera un sitio 100 % estático en la carpeta /out (gratis en Vercel, Netlify o Cloudflare Pages)
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
