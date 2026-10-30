import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Revelar from "@/components/Revelar";
import IntroArena from "@/components/IntroArena";
import { site } from "@/site.config";

const ADSENSE = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Empleos y convocatorias en Ica`, template: `%s | ${site.name}` },
  description: site.tagline,
  openGraph: { siteName: site.name, locale: site.locale, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE" suppressHydrationWarning>
      <head>
        {/* Activa las animaciones solo si el navegador ejecuta JavaScript */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* La animación de entrada solo se ve la primera vez y nunca si la persona pidió reducir el movimiento */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('chamba-intro')||matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('sin-intro');else setTimeout(function(){document.documentElement.classList.add('sin-intro')},4000)}catch(e){document.documentElement.classList.add('sin-intro')}",
          }}
        />
      </head>
      <body>
        <IntroArena />
        <Header />
        <main>{children}</main>
        <Footer />
        <Revelar />
        {/* Visitas y páginas vistas en Vercel → Analytics (sin cookies) */}
        <Analytics />
        {ADSENSE && (
          <Script
            async
            strategy="afterInteractive"
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE}`}
          />
        )}
      </body>
    </html>
  );
}
