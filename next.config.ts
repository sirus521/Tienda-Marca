import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/**
 * Habilita los bindings de Cloudflare (D1, R2) durante `next dev`.
 *
 * Se llama antes de exportar la configuración y NO necesita `await`. Levanta
 * un proxy de plataforma con Wrangler que simula los bindings, de modo que
 * `getCloudflareContext()` funciona en local sin desplegar. Es lo que evita
 * tener que hacer un deploy para probar una consulta.
 *
 * Se activa solo con `wrangler.jsonc` presente: sin bindings declarados, la
 * llamada únicamente añade ruido al arranque.
 */
initOpenNextCloudflareForDev();

/**
 * Configuración de Next.js.
 *
 * Objetivo de despliegue: Cloudflare Workers vía `@opennextjs/cloudflare`.
 *
 * NOTA — tamaño del script: el límite actual de un Worker es 64 MiB, no los
 * 3 MiB que aún se citan en documentación vieja. Aun así este
 * proyecto mantiene la disciplina de no cargar librerías de UI pesadas y usa
 * `LazyMotion` con `domAnimation` en lugar de importar el bundle completo de
 * animación. El tamaño real se mide antes de desplegar.
 */
const nextConfig: NextConfig = {
  /* Modo estricto de React: detecta efectos mal escritos en desarrollo. */
  reactStrictMode: true,

  /* No anunciar el framework en cada respuesta. */
  poweredByHeader: false,

  images: {
    /* AVIF primero, WebP de respaldo. Reduce el peso de las fotos de producto. */
    formats: ["image/avif", "image/webp"],
    /* Anchos alineados a la retícula real de la tienda (grid de 1/2/3 columnas). */
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920, 2560],
    imageSizes: [64, 96, 128, 200, 256, 384],
    /*
     * Las imágenes de producto vivirán en R2 y se servirán por el CDN de
     * Cloudflare. Cuando exista el bucket, se agrega aquí su dominio:
     * remotePatterns: [{ protocol: "https", hostname: "img.tudominio.com" }]
     */
    remotePatterns: [],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          /* Impide que el navegador adivine el tipo de contenido. */
          { key: "X-Content-Type-Options", value: "nosniff" },
          /* No filtrar la URL de origen a terceros. */
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          /* Bloquea APIs sensibles del navegador que la tienda no usa. */
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          /* Fuerza HTTPS durante un año. */
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;