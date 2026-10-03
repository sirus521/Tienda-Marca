import { desc, eq, inArray, sql } from "drizzle-orm";

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

export type NewProductInput = {
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  tags?: string[];
  status?: ProductStatus;
  isFeatured?: boolean;
  priceCents: number;
  stock: number;
  sku: string;
};

export type CatalogStats = {
  totalProducts: number;
  publishedProducts: number;
  draftProducts: number;
  archivedProducts: number;
  totalVariants: number;
  lowStockVariants: number;
};

export async function getCatalogStats(): Promise<CatalogStats> {
  const db = await getDb();

  const productRows = await db
    .select({
      status: products.status,
      count: sql<number>`count(*)`,
    })
    .from(products)
    .groupBy(products.status);

  const variantRows = await db.select({ count: sql<number>`count(*)` }).from(productVariants);

  const lowStockRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(productVariants)
    .where(sql`${productVariants.stock} > 0 and ${productVariants.stock} <= 5`);

  const countByStatus = Object.fromEntries(
    productRows.map((row) => [row.status, Number(row.count)]),
  );

  return {
    totalProducts: productRows.reduce((sum, row) => sum + Number(row.count), 0),
    publishedProducts: countByStatus.published ?? 0,
    draftProducts: countByStatus.draft ?? 0,
    archivedProducts: countByStatus.archived ?? 0,
    totalVariants: Number(variantRows[0]?.count ?? 0),
    lowStockVariants: Number(lowStockRows[0]?.count ?? 0),
  };
}

export async function createProduct(
  input: NewProductInput,
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  const db = await getDb();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  const sku = input.sku.trim();
  if (!sku) return { ok: false, error: "El SKU es obligatorio." };

  const priceCents = Math.round(input.priceCents);
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return { ok: false, error: "Precio no válido." };
  }

  const stock = Math.trunc(input.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, error: "Stock debe ser un entero no negativo." };
  }

  const rawSlug = input.slug?.trim() || name;
  const slug = await uniqueSlug(rawSlug);
  if (!slug) return { ok: false, error: "No se pudo generar un slug válido." };

  const productId = `prod_${crypto.randomUUID()}`;
  const variantId = `var_${crypto.randomUUID()}`;
  const tags = Array.isArray(input.tags) ? input.tags.map((tag) => tag.trim()).filter(Boolean) : [];

  await db.insert(products).values({
    id: productId,
    name,
    slug,
    description: input.description?.trim() || null,
    shortDescription: input.shortDescription?.trim() || null,
    category: input.category?.trim() || "playeras",
    tags: JSON.stringify(tags),
    details: "[]",
    careInstructions: "[]",
    measurements: "[]",
    status: input.status ?? "draft",
    isFeatured: input.isFeatured ?? false,
    seoTitle: null,
    seoDescription: null,
    metaImageId: null,
  });

  await db.insert(productVariants).values({
    id: variantId,
    productId,
    sku,
    optionValues: "{}",
    priceCents,
    compareAtPriceCents: null,
    stock,
    weightGrams: null,
    imageId: null,
  });

  return { ok: true, id: productId, slug };
}

export async function deleteProduct(
  productId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();

  const rows = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!rows[0]) return { ok: false, error: "El producto no existe." };

  await db.delete(products).where(eq(products.id, productId));
  return { ok: true };
}

async function uniqueSlug(text: string): Promise<string> {
  const db = await getDb();
  const base = slugify(text);
  if (!base) return "";

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, base))
    .limit(1);

  if (!existing[0]) return base;

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
