import type { Metadata, Viewport } from "next";
import { Bevan, Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { CartDrawer } from "@/components/cart/cart-drawer";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { brand } from "@/config/brand";
import { site } from "@/config/site";

import "./globals.css";

/**
 * Tipografías
 * ============================================================================
 * Tres familias, cada una con una función clara:
 *
 *   Bevan        → slab serif atlética. Es la voz del logo. Titulares y
 *                  el año del lockup. Una sola weight (400): es display.
 *   Inter        → grotesca neutra para cuerpo y UI. Excelente a tamaños
 *                  pequeños y en pantallas de baja densidad.
 *   JetBrains Mono → etiquetas técnicas: numeración de sección (01 / 04),
 *                  SKUs, folios de pedido y precios en tablas del admin.
 *
 * Solo se solicitan las weights que se usan de verdad. Cada weight extra es
 * un archivo más que descarga el visitante.
 *
 * `display: "swap"` → el texto se pinta de inmediato con la fuente de
 * respaldo y cambia al llegar la definitiva. Evita el bloqueo de render,
 * que es la causa más común de una mala métrica LCP.
 */
const display = Bevan({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bevan",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  /* Base para resolver URLs relativas en Open Graph y canónicas. */
  metadataBase: new URL(site.url),

  title: {
    default: site.titleTemplate(),
    template: `%s — ${brand.identity.name}`,
  },
  description: brand.identity.description,
  keywords: [...site.keywords],
  authors: [{ name: brand.identity.legalName }],
  creator: brand.identity.legalName,

  openGraph: {
    type: "website",
    locale: "es_MX",
    url: site.url,
    siteName: brand.identity.name,
    title: site.titleTemplate(),
    description: brand.identity.description,
    images: [{ url: site.defaultOgImage, width: 1200, height: 630 }],
  },

  twitter: {
    card: "summary_large_image",
    title: site.titleTemplate(),
    description: brand.identity.description,
    images: [site.defaultOgImage],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },

  alternates: { canonical: "/" },

  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  /* El papel es claro: la UI del navegador debe combinarse. */
  themeColor: "#f2f0eb",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    /* La clase `lenis` se aplica aquí, antes de que corra cualquier efecto,
       para que el CSS de Lenis esté activo desde el primer frame. */
    <html
      lang="es-MX"
      className={`${display.variable} ${sans.variable} ${mono.variable} lenis`}
    >
      <body className="grain relative flex min-h-dvh flex-col bg-paper text-ink">
        {/* Salto directo al contenido: primer elemento enfocable de la página. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-ink focus:px-4 focus:py-3 focus:font-mono focus:text-label focus:text-bone focus:uppercase"
        >
          Saltar al contenido
        </a>

        <SmoothScroll />

        <MotionProvider>
          <ScrollProgress />
          <Header />

          <main id="contenido" className="flex-1">
            {children}
          </main>

          <Footer />

          {/* El drawer del carrito vive aquí, una sola vez, para que esté
              disponible desde cualquier página sin duplicarlo. Se monta
              siempre en el árbol (aunque cerrado no pinta nada) porque su
              estado —abierto o cerrado— lo lleva el store de Zustand, y sacarlo
              del DOM entre navegaciones perdería la transición de salida. */}
          <CartDrawer />
        </MotionProvider>
      </body>
    </html>
  );
}