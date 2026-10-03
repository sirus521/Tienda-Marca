import { desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { collectionProducts, collections, productTags, tags } from "@/lib/db/schema";

/**
 * Taxonomía para el panel
 * ============================================================================
 * Collections y tags. La fase actual las muestra y permite el mínimo necesario:
 * activar/desactivar, destacar, crear o borrar tags. No se hace aquí el CRUD
 * editorial de producto; eso queda para una fase que cambie el catálogo.
 */

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFeatured: boolean;
  isPublished: boolean;
  position: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminTag = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

export async function listAdminCollections(): Promise<AdminCollection[]> {
  const db = await getDb();

  const rows = await db.select().from(collections).orderBy(collections.position);

  if (rows.length === 0) return [];

  const counts = await db
    .select({ collectionId: collectionProducts.collectionId, count: sql<number>`count(*)` })
    .from(collectionProducts)
    .where(
      inArray(
        collectionProducts.collectionId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(collectionProducts.collectionId);

  const countById = new Map(counts.map((row) => [row.collectionId, Number(row.count)]));

  return rows.map((row) => ({
    ...row,
    productCount: countById.get(row.id) ?? 0,
  }));
}

export async function listAdminTags(): Promise<AdminTag[]> {
  const db = await getDb();

  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      productCount: sql<number>`count(${productTags.productId})`,
    })
    .from(tags)
    .leftJoin(productTags, eq(productTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(tags.name));

  return rows.map((row) => ({
    ...row,
    productCount: Number(row.productCount ?? 0),
  }));
}

export async function updateCollectionFlags(input: {
  id: string;
  isPublished: boolean;
  isFeatured: boolean;
}): Promise<void> {
  const db = await getDb();
  await db
    .update(collections)
    .set({
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(collections.id, input.id));
}

export async function createTag(input: { name: string; slug: string }): Promise<void> {
  const db = await getDb();
  await db.insert(tags).values({
    id: crypto.randomUUID(),
    name: input.name,
    slug: input.slug,
  });
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(tags).where(eq(tags.id, id));
}
