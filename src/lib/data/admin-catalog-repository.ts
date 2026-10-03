import { desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { productVariants, products } from "@/lib/db/schema";
import { parseOptionValues } from "./order-repository";
import type { ProductStatus } from "@/lib/domain/types";

/**
 * Catálogo para el panel
 * ============================================================================
 * Fase 3: edición operativa de variantes y estado de publicación.
 *
 * NO se publica aquí el CRUD completo de productos. Lo que un admin necesita
 * cambiar día a día es stock, precio y estado de publicación. Crear productos
 * nuevos y borrar productos tocaría datos históricos de pedidos; hacerlo desde
 * el panel sin migrar otras piezas sería un error de modelo.
 */

export type AdminVariant = {
  id: string;
  sku: string;
  optionValues: Record<string, string>;
  priceCents: number;
  compareAtPriceCents: number | null;
  stock: number;
  imageId: string | null;
  weightGrams: number | null;
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  isFeatured: boolean;
  variants: AdminVariant[];
};

/** Lista productos con sus variantes para la tabla del panel. */
export async function listAdminProducts(): Promise<AdminProduct[]> {
  const db = await getDb();

  const rows = await db.select().from(products).orderBy(desc(products.createdAt));

  if (rows.length === 0) return [];

  const variantRows = await db
    .select()
    .from(productVariants)
    .where(
      inArray(
        productVariants.productId,
        rows.map((row) => row.id),
      ),
    );

  const variantsByProduct = new Map<string, AdminVariant[]>();

  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push({
      id: variant.id,
      sku: variant.sku,
      optionValues: parseOptionValues(variant.optionValues),
      priceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      stock: variant.stock,
      imageId: variant.imageId,
      weightGrams: variant.weightGrams,
    });
    variantsByProduct.set(variant.productId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    isFeatured: row.isFeatured,
    variants: variantsByProduct.get(row.id) ?? [],
  }));
}

/** Obtiene el slug del producto al que pertenece una variante. */
export async function getProductSlugForVariant(variantId: string): Promise<string | null> {
  const db = await getDb();

  const rows = await db
    .select({ slug: products.slug })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, variantId))
    .limit(1);

  return rows[0]?.slug ?? null;
}

/** Actualiza stock de una variante. */
export async function updateVariantStock(variantId: string, stock: number): Promise<void> {
  const db = await getDb();
  await db.update(productVariants).set({ stock }).where(eq(productVariants.id, variantId));

  /* Marca el producto como tocado sin reescribir su estado público. */
  await touchVariantProduct(variantId);
}

/** Actualiza precio de una variante. */
export async function updateVariantPrice(variantId: string, priceCents: number): Promise<void> {
  const db = await getDb();
  await db.update(productVariants).set({ priceCents }).where(eq(productVariants.id, variantId));

  await touchVariantProduct(variantId);
}

/** Cambia el estado de publicación de un producto. */
export async function updateProductStatus(productId: string, status: ProductStatus): Promise<void> {
  const db = await getDb();
  await db
    .update(products)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId));
}

async function touchVariantProduct(variantId: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ productId: productVariants.productId })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  const productId = rows[0]?.productId;
  if (!productId) return;

  await db
    .update(products)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId));
}
