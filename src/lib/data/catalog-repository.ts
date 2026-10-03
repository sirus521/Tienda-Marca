import { and, eq, inArray } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  productImages,
  productOptions,
  productOptionValues,
  products,
  productVariants,
} from "@/lib/db/schema";
import { getMinPrice } from "@/lib/domain/catalog";
import type {
  MeasurementRow,
  Product,
  ProductDetail,
  ProductImage,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
} from "@/lib/domain/types";

/**
 * Repositorio del catálogo
 * ============================================================================
 * Única puerta de entrada a los datos de producto. Ningún componente importa
 * `seed-products` directamente: todos pasan por aquí.
 *
 * LEÍDO DE CLOUDLARE D1
 * Las filas salen de la base y se reensamblan aquí en un `Product`. La
 * traducción se hace en una sola función, `assemble`, y de ahí en adelante
 * todo el código de la tienda trabaja con el tipo de dominio, igual que antes.
 *
 * POR QUÉ DÓNDE ESTÁ LA FRONTERA IMPORTA
 * Ninguna otra parte del proyecto importa drizzle. Si el catálogo se moviera a
 * Postgres mañana, o volviera a un archivo, el cambio se haría en este archivo
 * y en el esquema. Los componentes, las páginas y el carrito no se tocan.
 *
 * POR QUÉ TODAS SON `async`
 * Fue la decisión clave desde el principio, cuando solo había un archivo. Con
 * base de datos deja de ser una precaución y pasa a ser lo natural: leer es
 * siempre asíncrono. Ese diseño es la razón de que esta migración no haya
 * obligado a cambiar ni un solo componente.
 *
 * NOTA DE RENDIMIENTO
 * Consultar por producto sería un N+1: cinco consultas para ver un artículo y
 * cuarenta para ver el catálogo. En su lugar se cargan todas las filas hijas de
 * los productos pedidos en un `batch` y se agrupan en memoria. Son SIEMPRE
 * cinco consultas, diga lo que diga el número de productos.
 *
 * Filtrar y ordenar en JavaScript, y no en SQL, es aceptable mientras el
 * catálogo quepa holgadamente en memoria. El día que deje de caber, el cambio
 * es local a `listProducts`: los filtros ya están identificados y son triviales
 * de expresar como `WHERE`.
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

/* ============================================================================
   LECTURA DEL JSON
   ============================================================================
   Las columnas `tags`, `details`, `care_instructions` y `measurements` guardan
   JSON en TEXT. El tipo de la columna no lo valida, así que una fila con un
   valor corrupto —un `UPDATE` a mano, un texto pegado desde el panel— llega
   aquí como string y revienta el `.map`. Cada lectura cae a un valor vacío en
   vez de propagar el error: una ficha que se pinte sin su guía de medidas sale
   más barato que una tienda en blanco.
   ============================================================================ */
function parseJson<T>(raw: string, fallback: T): T {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/* ============================================================================
   ENSAMBLADO
   ============================================================================ */
type ChildRows = {
  images: (typeof productImages.$inferSelect)[];
  variants: (typeof productVariants.$inferSelect)[];
  options: (typeof productOptions.$inferSelect)[];
  optionValues: (typeof productOptionValues.$inferSelect)[];
};

/**
 * Pasa las filas de la tabla `products` al tipo de dominio.
 *
 * Es la única función que conoce las dos formas. Todo el resto de la tienda
 * solo conoce `Product`.
 */
function assemble(row: typeof products.$inferSelect, children: ChildRows): Product {
  const images: ProductImage[] = children.images.map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
    position: image.position,
    isPrimary: image.isPrimary,
  }));

  const variants: ProductVariant[] = children.variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    priceCents: variant.priceCents,
    compareAtPriceCents: variant.compareAtPriceCents,
    stock: variant.stock,
    optionValues: parseJson<Record<string, string>>(variant.optionValues, {}),
    imageId: variant.imageId,
    weightGrams: variant.weightGrams,
  }));

  const options: ProductOption[] = children.options.map((option) => ({
    id: option.id,
    name: option.name,
    position: option.position,
    values: children.optionValues
      .filter((value) => value.optionId === option.id)
      .map(
        (value): ProductOptionValue => ({
          id: value.id,
          value: value.value,
          hexColor: value.hexColor,
          position: value.position,
        }),
      ),
  }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription ?? "",
    description: row.description ?? "",
    category: row.category,
    tags: parseJson<string[]>(row.tags, []),
    status: row.status,
    isFeatured: row.isFeatured,
    details: parseJson<ProductDetail[]>(row.details, []),
    careInstructions: parseJson<string[]>(row.careInstructions, []),
    measurements: parseJson<MeasurementRow[]>(row.measurements, []),
    options,
    variants,
    images,
    seo: {
      title: row.seoTitle ?? row.name,
      description: row.seoDescription ?? row.shortDescription ?? "",
      imageId: row.metaImageId,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Carga productos y todas sus filas hijas.
 *
 * `where` debe traer ya puesto el filtro de publicación. Las cinco consultas
 * viajan en un solo `batch`: D1 las resuelve como una unidad y, sobre todo,
 * cuenta como una sola ida a la base en vez de cuatro.
 */
async function loadProducts(
  where: SQL | undefined,
  orderBy?: (rows: typeof products.$inferSelect[]) => typeof products.$inferSelect[],
): Promise<Product[]> {
  const db = await getDb();

  const rows = orderBy
    ? orderBy(await db.select().from(products).where(where))
    : await db.select().from(products).where(where);

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);

  const [imageRows, variantRows, optionRows, optionValueRows] = await db.batch([
    db.select().from(productImages).where(inArray(productImages.productId, ids)),
    db.select().from(productVariants).where(inArray(productVariants.productId, ids)),
    db.select().from(productOptions).where(inArray(productOptions.productId, ids)),
    db
      .select()
      .from(productOptionValues)
      .where(
        inArray(
          productOptionValues.optionId,
         /* Los valores se piden por `optionId`, y conocer esos ids exige una
            vuelta previa. En vez de una quinta consulta, el `inArray` anidado
            deja que D1 lo resuelva todo en una sola sentencia. */
          db
            .select({ id: productOptions.id })
            .from(productOptions)
            .where(inArray(productOptions.productId, ids)),
        ),
      ),
  ]);

  const children: ChildRows = {
    images: imageRows as typeof productImages.$inferSelect[],
    variants: variantRows as typeof productVariants.$inferSelect[],
    options: optionRows as typeof productOptions.$inferSelect[],
    optionValues: optionValueRows as typeof productOptionValues.$inferSelect[],
  };

  return rows.map((row) =>
    assemble(row, {
      images: children.images.filter((image) => image.productId === row.id),
      variants: children.variants.filter((variant) => variant.productId === row.id),
      options: children.options.filter((option) => option.productId === row.id),
      optionValues: children.optionValues,
    }),
  );
}

/* ============================================================================
   FILTROS Y ORDEN
   ============================================================================ */

/**
 * Ordena los productos.
 *
 * El orden por defecto es "lo más reciente primero": quien vuelve a la tienda
 * busca lo que acaba de entrar, no lo más antiguo. Para el orden por precio se
 * usa el precio MÍNIMO del producto, que es el que se muestra en la tarjeta.
 * Ordenar por otro valor haría que la lista pareciera desordenada.
 */
function sortProducts(list: Product[], sort: ProductSort = "recientes"): Product[] {
  const sorted = list.slice();

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

/** `true` si el producto tiene stock en la talla indicada. */
function hasStockInSize(product: Product, size: string): boolean {
  return product.variants.some(
    (variant) => variant.optionValues["Talla"] === size && variant.stock > 0,
  );
}

/** El filtro de publicación. Es la barrera de la tienda. */
const published = eq(products.status, "published");

/* ============================================================================
   CONSULTAS PÚBLICAS
   ============================================================================ */

/** Lista productos publicados, con filtros opcionales. */
export async function listProducts(query: ProductQuery = {}): Promise<Product[]> {
  const { category, tag, featuredOnly = false, size, sort = "recientes", limit } = query;

  const conditions: SQL[] = [published];

  if (category) conditions.push(eq(products.category, category));
  if (featuredOnly) conditions.push(eq(products.isFeatured, true));

  let result = await loadProducts(and(...conditions));

  /* Estos dos filtros se aplican en memoria porque dependen de datos que viven
     en las filas hijas: la etiqueta está en el JSON de `products.tags` y el
     stock en `product_variants`. Traducirlos a SQL exigiría un `EXISTS` sobre
     `product_tags` y una agregación por variante, para un catálogo que cabe
     de sobra en memoria. */
  if (tag) {
    result = result.filter((product) => product.tags.includes(tag));
  }

  if (size) {
    result = result.filter((product) => hasStockInSize(product, size));
  }

  const sorted = sortProducts(result, sort);

  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

/** Producto por slug. `null` si no existe o no está publicado. */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const result = await loadProducts(and(published, eq(products.slug, slug)));
  return result[0] ?? null;
}

/** Productos destacados para la portada. */
export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  return listProducts({ featuredOnly: true, limit });
}

/** Slugs publicados. Alimenta `generateStaticParams` y el sitemap. */
export async function listProductSlugs(): Promise<string[]> {
  const db = await getDb();
  const rows = await db
    .select({ slug: products.slug })
    .from(products)
    .where(published)
    .orderBy(products.slug);
  return rows.map((row) => row.slug);
}

/**
 * Variantes concretas por id, con los datos mínimos para pintar una línea de
 * pedido.
 *
 * La usa el checkout para recuperar lo que el navegador no debe decidir: nombre,
 * precio e imagen. Devuelve solo lo publicado, por el mismo motivo que el resto
 * de funciones: una URL guardada en `localStorage` no autoriza a pedir un
 * producto despublicado.
 *
 * Las imágenes que no existen devuelven cadena vacía en vez de `null` porque
 * quien la consume es un `<Image src>` opcional, y así no tiene que distinguir
 * dos formas de "no hay foto".
 *
 * RESBALDO A LA FOTO DEL PRODUCTO
 * Casi ninguna variante trae `imageId` propio: una foto por talla o por color
 * solo tiene sentido cuando las prendas se ven distintas. El caso normal es
 * `imageId = null` y la foto es la del producto. Si aquí no se resuelve ese
 * respaldo, la línea del carrito, el resumen del checkout y el artículo
 * guardado en el pedido salen todos sin foto, que es justo el dato que hace
 * falta para reconocer la prenda en el WhatsApp.
 */
export async function listProductVariants(ids: readonly string[]): Promise<
  Array<{
    id: string;
    productId: string;
    productSlug: string;
    productName: string;
    sku: string;
    optionValues: Record<string, string>;
    priceCents: number;
    stock: number;
    imageUrl: string;
    imageAlt: string;
  }>
> {
  if (ids.length === 0) return [];

  const db = await getDb();

  const rows = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      priceCents: productVariants.priceCents,
      stock: productVariants.stock,
      optionValues: productVariants.optionValues,
      imageId: productVariants.imageId,
      productName: products.name,
      productSlug: products.slug,
      productStatus: products.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(published, inArray(productVariants.id, ids)));

  /* Una sola consulta para las fotos de todas las variantes pedidas. */
  const imageIds = rows.map((row) => row.imageId).filter((id): id is string => id !== null);
  const imageRows =
    imageIds.length === 0
      ? []
      : await db
          .select({ id: productImages.id, url: productImages.url, alt: productImages.alt })
          .from(productImages)
          .where(inArray(productImages.id, imageIds));

  const imagesById = new Map(imageRows.map((image) => [image.id, image]));

  /* Y otra para las fotos de los productos, que son el respaldo cuando la
     variante no trae una propia. Se piden por producto y se elige la
     principal, con la misma regla que `getPrimaryImage`: la marcada como
     principal y, si no hay ninguna, la de menor `position`. */
  const productIds = [...new Set(rows.map((row) => row.productId))];
  const productImageRows =
    productIds.length === 0
      ? []
      : await db
          .select({
            id: productImages.id,
            productId: productImages.productId,
            url: productImages.url,
            alt: productImages.alt,
            isPrimary: productImages.isPrimary,
            position: productImages.position,
          })
          .from(productImages)
          .where(inArray(productImages.productId, productIds));

  const fallbackByProduct = new Map<string, (typeof productImageRows)[number]>();
  for (const image of productImageRows) {
    const current = fallbackByProduct.get(image.productId);
    const isBetter =
      !current ||
      (image.isPrimary && !current.isPrimary) ||
      (image.isPrimary === current.isPrimary && image.position < current.position);
    if (isBetter) fallbackByProduct.set(image.productId, image);
  }

  return rows.map((row) => {
    const own = row.imageId ? imagesById.get(row.imageId) : undefined;
    const fallback = fallbackByProduct.get(row.productId);
    const image = own ?? fallback;

    return {
      id: row.id,
      productId: row.productId,
      productSlug: row.productSlug,
      productName: row.productName,
      sku: row.sku,
      optionValues: parseJson<Record<string, string>>(row.optionValues, {}),
      priceCents: row.priceCents,
      stock: row.stock,
      imageUrl: image?.url ?? "",
      imageAlt: image?.alt ?? row.productName,
    };
  });
}

/** Etiquetas distintas del catálogo, en orden alfabético. */
export async function listTags(): Promise<string[]> {
  const result = await loadProducts(published);
  const tags = new Set<string>();

  for (const product of result) {
    for (const tag of product.tags) tags.add(tag);
  }

  return [...tags].sort((a, b) => a.localeCompare(b, "es"));
}

/** Tallas disponibles con stock en todo el catálogo, ordenadas de menor a mayor. */
export async function listAvailableSizes(): Promise<string[]> {
  const order = ["XS", "S", "M", "L", "XL", "XXL"];
  const result = await loadProducts(published);
  const sizes = new Set<string>();

  for (const product of result) {
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
  const result = await loadProducts(published);
  const pool = result.filter((item) => item.id !== product.id);

  const sameCategory = pool.filter((item) => item.category === product.category);
  const rest = pool.filter((item) => item.category !== product.category);

  return [...sameCategory, ...rest].slice(0, limit);
}
