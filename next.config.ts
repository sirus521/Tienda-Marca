import type { NextConfig } from "next";

/**
 * Configuración de Next.js.
 *
 * Objetivo de despliegue: Cloudflare Workers vía `@opennextjs/cloudflare`.
 *
 * OJO — límite conocido: el plan gratuito de Workers permite un script de
 * hasta 3 MiB. Por eso este proyecto evita a propósito librerías de UI
 * pesadas y usa `LazyMotion` con `domAnimation` en lugar de importar todo
 * el bundle de animación. El tamaño real se mide antes de desplegar.
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

  /*
   * FASE 4 — al agregar Cloudflare D1 y R2:
   *
   *   import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
   *   initOpenNextCloudflareForDev();
   *
   * Habilita el acceso a los bindings de Cloudflare desde `next dev`, para
   * no tener que desplegar solo para probar una consulta. Se activa cuando
   * exista `wrangler.jsonc`, no antes: sin binding, la llamada solo agrega
   * ruido al arranque.
   */
};

export default nextConfig;