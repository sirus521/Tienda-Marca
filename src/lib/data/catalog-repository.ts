import { getMinPrice } from "@/lib/domain/catalog";
import type { Product } from "@/lib/domain/types";

import { seedProducts } from "./seed-products";

/**
 * Repositorio del catálogo
 * ============================================================================
 * Única puerta de entrada a los datos de producto. Ningún componente importa
 * `seed-products` directamente: todos pasan por aquí.
 *
 * POR QUÉ ESTO IMPORTA
 * Hoy los datos viven en un archivo. En la Fase 4 vivirán en Cloudflare D1 y
 * se consultarán con SQL. Gracias a esta capa, ese cambio ocurre en UN archivo
 * y la tienda entera sigue funcionando sin tocar un solo componente.
 *
 * POR QUÉ TODAS SON `async`
 * Es la decisión clave. Si hoy fueran síncronas y devolvieran el arreglo
 * directo, convertir la tienda a base de datos obligaría a cambiar cada punto
 * de llamada, cada `await`, cada componente. Siendo `async` desde el inicio,
 * el día de la migración solo cambia el cuerpo de estas funciones.
 * Cuesta cero hoy y ahorra una refactorización completa después.
 *
 * NOTA DE RENDIMIENTO
 * Al leer de un archivo no hay latencia, así que no hay caché. Cuando entren
 * las consultas a D1, cada función se envolverá con caché de Next.js
 * (`unstable_cache`) y con el cacheo del edge de Cloudflare.
 */

/** Criterios de ordenamiento del listado. */
export type ProductSort = "recientes" | "precio-asc" | "precio-desc" | "nombre";

/** Filtros que acepta el listado público. */
export type ProductQuery = {
  category?: string;
  tag?: string;
  /** Solo productos marcados como destacados. */
  featuredOnly?: boolean;
  /** Disponible en esa talla y con stock. */
  size?: string;
  /** Orden de los resultados. Por defecto, lo más reciente primero. */
  sort?: ProductSort;
  limit?: number;
};

/**
 * Ordena los productos.
 *
 * El orden por defecto es "lo más reciente primero": quien vuelve a la tienda
 * busca lo que acaba de entrar, no lo más antiguo. Para el orden por precio se
 * usa el precio MÍNIMO del producto, que es el que se muestra en la tarjeta.
 * Ordenar por otro valor haría que la lista pareciera desordenada.
 */
function sortProducts(products: Product[], sort: ProductSort = "recientes"): Product[] {
  const sorted = products.slice();

  switch (sort) {
    case "precio-asc":
      return sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    case "precio-desc":
      return sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    case "nombre":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}

/**
 * Filtra el catálogo publicado.
 * Es la barrera de seguridad de la tienda: nada en estado `draft` o
 * `archived` puede salir por aquí.
 */
function publishedOnly(products: readonly Product[]): Product[] {
  return products.filter((product) => product.status === "published");
}

/** `true` si el producto tiene stock en la talla indicada. */
function hasStockInSize(product: Product, size: string): boolean {
  return product.variants.some(
    (variant) => variant.optionValues["Talla"] === size && variant.stock > 0,
  );
}

/** Lista productos publicados, con filtros opcionales. */
export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { category, tag, featuredOnly = false, size, sort = "recientes", limit } = query;

  let result = publishedOnly(seedProducts);

  if (category) {
    result = result.filter((product) => product.category === category);
  }

  if (tag) {
    result = result.filter((product) => product.tags.includes(tag));
  }

  if (featuredOnly) {
    result = result.filter((product) => product.isFeatured);
  }

  if (size) {
    result = result.filter((product) => hasStockInSize(product, size));
  }

  const sorted = sortProducts(result, sort);

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/** Producto por slug. `null` si no existe o no está publicado. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  return publishedOnly(seedProducts).find((product) => product.slug === slug) ?? null;
}

/** Productos destacados para la portada. */
export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return listProducts({ featuredOnly: true, limit });
}

/** Slugs publicados. Alimenta `generateStaticParams` y el sitemap. */
export async function listProductSlugs(): Promise<string[]> {
  return publishedOnly(seedProducts).map((product) => product.slug);
}

/** Etiquetas distintas del catálogo, en orden alfabético. */
export async function listTags(): Promise<string[]> {
  const tags = new Set<string>();
  for (const product of publishedOnly(seedProducts)) {
    for (const tag of product.tags) tags.add(tag);
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "es"));
}

/** Tallas disponibles con stock en todo el catálogo, ordenadas de menor a mayor. */
export async function listAvailableSizes(): Promise<string[]> {
  const order = ["XS", "S", "M", "L", "XL", "XXL"];
  const sizes = new Set<string>();

  for (const product of publishedOnly(seedProducts)) {
    for (const variant of product.variants) {
      if (variant.stock <= 0) continue;
      const size = variant.optionValues["Talla"];
      if (size) sizes.add(size);
    }
  }

  return [...sizes].sort((a, b) => {
    const indexA = order.indexOf(a);
    const indexB = order.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

/**
 * Productos relacionados: misma categoría, excluyendo el actual.
 * Si no alcanzan, se rellena con el resto del catálogo para no dejar una
 * sección vacía al final de la página de producto.
 */
export async function listRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  const pool = publishedOnly(seedProducts).filter((item) => item.id !== product.id);

  const sameCategory = pool.filter((item) => item.category === product.category);
  const rest = pool.filter((item) => item.category !== product.category);

  return [...sameCategory, ...rest].slice(0, limit);
}