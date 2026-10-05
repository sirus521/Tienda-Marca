import type { MetadataRoute } from "next";

import { site } from "@/config/site";
import { listProducts } from "@/lib/data/catalog-repository";

/**
 * sitemap.xml
 * ============================================================================
 * Se genera desde el catálogo real: portada, tienda y una entrada por producto
 * publicado.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts({});

  const entries: MetadataRoute.Sitemap = [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${site.url}/tienda`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const product of products) {
    entries.push({
      url: `${site.url}/producto/${product.slug}`,
      lastModified: new Date(product.updatedAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
