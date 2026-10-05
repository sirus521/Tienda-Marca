import type { MetadataRoute } from "next";

import { site } from "@/config/site";

/**
 * robots.txt
 * ============================================================================
 * Permite indexar todo el catálogo y bloquea las áreas internas (admin) o
 * transversales que no aportan SEO (carrito, checkout). Cada página declara ya
 * su `metadata.robots`; este es el resumen para los crawlers.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/carrito", "/checkout"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
