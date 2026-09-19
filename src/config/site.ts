import { brand } from "@/config/brand";

/**
 * Configuración técnica del sitio (no de marca).
 * Metadatos, SEO y capacidades. La identidad vive en `brand.ts`.
 */
export const site = {
  /**
   * URL canónica. En Cloudflare Workers se resuelve por variable de entorno;
   * en local cae a localhost. Necesaria para Open Graph y sitemap correctos.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** Zona horaria de operación. Define los cortes de "ventas de la semana". */
  timezone: "America/Monterrey",

  /** Imagen de Open Graph por defecto. Se reemplaza por la real en Fase 8. */
  defaultOgImage: "/og/default.jpg",

  /** Plantilla de títulos. `%s` lo sustituye la página. */
  titleTemplate: (page?: string) =>
    page ? `${page} — ${brand.identity.name}` : `${brand.identity.name} — ${brand.identity.tagline}`,

  /** Palabras clave base. Se suman a las específicas de cada producto. */
  keywords: [
    "playera oversize",
    "oversize tee",
    "ropa oversize México",
    "streetwear Monterrey",
    "playeras de algodón pesado",
  ],

  /** Rutas que no deben indexarse en buscadores. */
  noIndexPaths: ["/admin", "/checkout", "/carrito", "/pedido"],

  /**
   * Ancho máximo de subida de imagen, en píxeles.
   * La compresión ocurre en el navegador antes de subir a R2: una foto de
   * celular de 4 MB baja a ~200 KB, lo que multiplica por 26 el espacio
   * disponible antes de necesitar más almacenamiento.
   */
  imageUpload: {
    maxDimension: 2000,
    quality: 0.8,
    maxFileSizeBytes: 25 * 1024 * 1024,
    acceptedTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"] as const,
  },
} as const;

export type Site = typeof site;