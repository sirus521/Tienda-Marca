import { desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  productImages,
  productOptions,
  productOptionValues,
  productVariants,
  products,
} from "@/lib/db/schema";
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

/* ==================================================================
   EDITOR DE PRODUCTO (Fase 4)
   Editar los campos del producto, gestionar opciones/variantes y
   adjuntar imágenes. `order_items` no tiene FK a variantes, así que
   borrar variantes no rompe pedidos históricos.
   ================================================================== */

/** Precio almacenado de una variante (para validar RBAC en precio). */
export async function getVariantPriceCents(variantId: string): Promise<number | null> {
  const db = await getDb();
  const rows = await db
    .select({ priceCents: productVariants.priceCents })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return rows[0]?.priceCents ?? null;
}

export type AdminProductDetail = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  status: ProductStatus;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  metaImageId: string | null;
  variants: AdminVariant[];
  options: { id: string; name: string; position: number }[];
  optionValues: {
    id: string;
    optionId: string;
    value: string;
    hexColor: string | null;
    position: number;
  }[];
  images: {
    id: string;
    url: string;
    alt: string;
    width: number;
    height: number;
    position: number;
    isPrimary: boolean;
  }[];
};

/** Carga un producto con variantes, opciones e imágenes para el editor. */
export async function getAdminProductDetail(id: string): Promise<AdminProductDetail | null> {
  const db = await getDb();
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  const row = rows[0];
  if (!row) return null;

  const [variantRows, optionRows, imageRows] = await db.batch([
    db.select().from(productVariants).where(eq(productVariants.productId, id)),
    db.select().from(productOptions).where(eq(productOptions.productId, id)),
    db.select().from(productImages).where(eq(productImages.productId, id)),
  ]);

  const optionValuesRows = optionRows.length
    ? await db
        .select()
        .from(productOptionValues)
        .where(
          inArray(
            productOptionValues.optionId,
            optionRows.map((option) => option.id),
          ),
        )
    : [];

  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags) as string[];
  } catch {
    tags = [];
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.shortDescription,
    description: row.description,
    category: row.category,
    tags,
    status: row.status,
    isFeatured: row.isFeatured,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    metaImageId: row.metaImageId,
    variants: variantRows.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      optionValues: parseOptionValues(variant.optionValues),
      priceCents: variant.priceCents,
      compareAtPriceCents: variant.compareAtPriceCents,
      stock: variant.stock,
      imageId: variant.imageId,
      weightGrams: variant.weightGrams,
    })),
    options: optionRows.map((option) => ({
      id: option.id,
      name: option.name,
      position: option.position,
    })),
    optionValues: optionValuesRows.map((value) => ({
      id: value.id,
      optionId: value.optionId,
      value: value.value,
      hexColor: value.hexColor,
      position: value.position,
    })),
    images: imageRows.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      width: image.width,
      height: image.height,
      position: image.position,
      isPrimary: image.isPrimary,
    })),
  };
}

export type UpdateProductInput = {
  name: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  tags?: string[];
  status?: ProductStatus;
  isFeatured?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

/** Edita los campos de un producto existente. Devuelve el slug final. */
export async function updateProduct(
  productId: string,
  input: UpdateProductInput,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const db = await getDb();

  const rows = await db
    .select({ id: products.id, slug: products.slug })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!rows[0]) return { ok: false, error: "El producto no existe." };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "El nombre es obligatorio." };

  let slug = rows[0].slug;
  if (
    typeof input.slug === "string" &&
    input.slug.trim() !== "" &&
    input.slug.trim() !== rows[0].slug
  ) {
    slug = await uniqueSlug(input.slug.trim());
    if (!slug) return { ok: false, error: "No se pudo generar un slug válido." };
  }

  const set: Record<string, unknown> = {
    name,
    slug,
    shortDescription: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    category: input.category?.trim() || "playeras",
    tags: JSON.stringify(
      Array.isArray(input.tags) ? input.tags.map((tag) => tag.trim()).filter(Boolean) : [],
    ),
    isFeatured: input.isFeatured ?? false,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
    updatedAt: new Date().toISOString(),
  };
  if (input.status !== undefined) set.status = input.status;

  await db.update(products).set(set).where(eq(products.id, productId));

  return { ok: true, slug };
}

export async function addOption(
  productId: string,
  name: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const db = await getDb();
  const name_trimmed = name.trim();
  if (!name_trimmed) return { ok: false, error: "El nombre del eje es obligatorio." };
  const id = `opt_${crypto.randomUUID()}`;
  await db.insert(productOptions).values({ id, productId, name: name_trimmed, position: 0 });
  return { ok: true, id };
}

export async function removeOption(optionId: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.id, optionId))
    .limit(1);
  const option = rows[0];
  if (!option) return { ok: false, error: "El eje no existe." };

  /* Bloquea si alguna variante usa ese eje en sus optionValues. */
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, option.productId));
  const used = variants.some(
    (variant) => parseOptionValues(variant.optionValues)[option.name] !== undefined,
  );
  if (used)
    return { ok: false, error: `No puedes quitar "${option.name}": hay variantes que lo usan.` };

  await db.delete(productOptions).where(eq(productOptions.id, optionId));
  return { ok: true };
}

export async function addOptionValue(
  optionId: string,
  value: string,
  hexColor: string | null,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const db = await getDb();
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error: "El valor es obligatorio." };
  const id = `optv_${crypto.randomUUID()}`;
  await db
    .insert(productOptionValues)
    .values({ id, optionId, value: trimmed, hexColor: hexColor || null, position: 0 });
  return { ok: true, id };
}

export async function removeOptionValue(
  optionValueId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const rows = await db
    .select({
      value: productOptionValues.value,
      optionId: productOptionValues.optionId,
      productId: productOptions.productId,
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptionValues.optionId, productOptions.id))
    .where(eq(productOptionValues.id, optionValueId))
    .limit(1);
  const target = rows[0];
  if (!target) return { ok: false, error: "El valor no existe." };

  const optionRows = await db
    .select({ name: productOptions.name })
    .from(productOptions)
    .where(eq(productOptions.id, target.optionId));
  const optionName = optionRows[0]?.name;
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, target.productId));
  const used = variants.some((variant) => {
    const vals = parseOptionValues(variant.optionValues);
    return optionName !== undefined && vals[optionName] === target.value;
  });
  if (used)
    return { ok: false, error: `No puedes quitar "${target.value}": hay variantes que lo usan.` };

  await db.delete(productOptionValues).where(eq(productOptionValues.id, optionValueId));
  return { ok: true };
}

export type NewVariantInput = {
  sku: string;
  optionValues?: Record<string, string>;
  priceCents: number;
  stock: number;
  weightGrams?: number | null;
  imageId?: string | null;
};

export async function addVariant(
  productId: string,
  input: NewVariantInput,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const db = await getDb();
  const sku = input.sku.trim();
  if (!sku) return { ok: false, error: "El SKU es obligatorio." };
  if (!Number.isFinite(input.priceCents) || input.priceCents < 0)
    return { ok: false, error: "Precio no válido." };
  if (!Number.isInteger(input.stock) || input.stock < 0)
    return { ok: false, error: "Stock no válido." };

  const id = `var_${crypto.randomUUID()}`;
  await db.insert(productVariants).values({
    id,
    productId,
    sku,
    optionValues: JSON.stringify(input.optionValues ?? {}),
    priceCents: Math.round(input.priceCents),
    compareAtPriceCents: null,
    stock: input.stock,
    weightGrams: input.weightGrams ?? null,
    imageId: input.imageId ?? null,
  });

  await db
    .update(products)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId));
  return { ok: true, id };
}

export async function deleteVariant(variantId: string): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  return { ok: true };
}

/* ---------------- IMÁGENES ---------------- */

export async function addProductImage(
  productId: string,
  input: { url: string; alt?: string; width?: number; height?: number },
): Promise<{ ok: boolean; error?: string; id?: string }> {
  const db = await getDb();
  const id = `img_${crypto.randomUUID()}`;
  const existing = await db
    .select({ id: productImages.id })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  await db.insert(productImages).values({
    id,
    productId,
    url: input.url,
    alt: input.alt?.trim() ?? "",
    width: input.width ?? 0,
    height: input.height ?? 0,
    position: existing.length,
    isPrimary: existing.length === 0,
  });
  if (existing.length === 0) {
    await db.update(products).set({ metaImageId: id }).where(eq(products.id, productId));
  }
  return { ok: true, id };
}

export async function setPrimaryImage(imageId: string): Promise<void> {
  const db = await getDb();
  const rows = await db
    .select({ productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  const productId = rows[0]?.productId;
  if (!productId) return;
  await db
    .update(productImages)
    .set({ isPrimary: false })
    .where(eq(productImages.productId, productId));
  await db.update(productImages).set({ isPrimary: true }).where(eq(productImages.id, imageId));
  await db
    .update(products)
    .set({ metaImageId: imageId, updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId));
}

export async function deleteProductImage(imageId: string): Promise<{ ok: boolean; url?: string }> {
  const db = await getDb();
  const rows = await db
    .select({ url: productImages.url, productId: productImages.productId })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  const row = rows[0];
  await db.delete(productImages).where(eq(productImages.id, imageId));
  return { ok: true, url: row?.url };
}

export async function getProductImageUrl(imageId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ url: productImages.url })
    .from(productImages)
    .where(eq(productImages.id, imageId))
    .limit(1);
  return rows[0]?.url ?? null;
}

/** Actualiza el peso y la imagen de una variante (precio/stock van aparte por RBAC). */
export async function updateVariantDetails(
  variantId: string,
  input: { weightGrams?: number | null; imageId?: string | null },
): Promise<void> {
  const db = await getDb();
  const set: Record<string, unknown> = {};
  if (input.weightGrams !== undefined) set.weightGrams = input.weightGrams;
  if (input.imageId !== undefined) set.imageId = input.imageId;
  if (Object.keys(set).length === 0) return;
  await db.update(productVariants).set(set).where(eq(productVariants.id, variantId));
  await touchVariantProduct(variantId);
}
