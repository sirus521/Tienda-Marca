"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createProduct,
  deleteProduct,
  getProductSlugForVariant,
  updateProductStatus,
  updateVariantPrice,
  updateVariantStock,
} from "@/lib/data/admin-catalog-repository";
import { writeAuditLog } from "@/lib/data/admin-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";
import { parsePriceInput } from "@/lib/domain/money";
import type { ProductStatus } from "@/lib/domain/types";

const VALID_STATUSES: ProductStatus[] = ["draft", "published", "archived"];

function safeReturnTo(raw: FormDataEntryValue | null): string {
  if (typeof raw === "string" && raw.startsWith("/admin/catalogo")) return raw;
  return "/admin/catalogo";
}

export async function updateVariantAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const variantId = formData.get("variantId");
  const stockRaw = formData.get("stock");
  const priceRaw = formData.get("price");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof variantId !== "string" || variantId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Variante no válida.")}`);
  }

  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    redirect(`${returnTo}?error=${encodeURIComponent("Stock debe ser un entero no negativo.")}`);
  }

  const priceCents = typeof priceRaw === "string" ? parsePriceInput(priceRaw) : null;
  if (priceCents === null) {
    redirect(`${returnTo}?error=${encodeURIComponent("Precio no válido.")}`);
  }

  await updateVariantStock(variantId, stock);
  await updateVariantPrice(variantId, priceCents);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.variant.update",
    entity: "variant",
    entityId: variantId,
    payload: { stock, priceCents },
  });

  const slug = await getProductSlugForVariant(variantId);
  revalidatePath("/admin/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda");
  if (slug) revalidatePath(`/producto/${slug}`);

  redirect(`${returnTo}?ok=${encodeURIComponent("Variante actualizada.")}`);
}

export async function updateProductStatusAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const statusRaw = formData.get("status");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || productId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Producto no válido.")}`);
  }

  if (typeof statusRaw !== "string" || !VALID_STATUSES.includes(statusRaw as ProductStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Estado no válido.")}`);
  }

  const status = statusRaw as ProductStatus;
  await updateProductStatus(productId, status);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.product.status",
    entity: "product",
    entityId: productId,
    payload: { status },
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda");

  redirect(`${returnTo}?ok=${encodeURIComponent("Estado actualizado.")}`);
}

export async function createProductAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const name = formData.get("name");
  const slug = formData.get("slug");
  const priceRaw = formData.get("price");
  const stockRaw = formData.get("stock");
  const skuRaw = formData.get("sku");
  const shortDescription = formData.get("shortDescription");
  const description = formData.get("description");
  const category = formData.get("category");
  const tagsRaw = formData.get("tags");
  const statusRaw = formData.get("status");
  const isFeatured = formData.get("isFeatured") === "on";
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof name !== "string" || name.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("El nombre es obligatorio.")}`);
  }

  const priceCents = typeof priceRaw === "string" ? parsePriceInput(priceRaw) : null;
  if (priceCents === null) {
    redirect(`${returnTo}?error=${encodeURIComponent("Precio no válido.")}`);
  }

  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    redirect(`${returnTo}?error=${encodeURIComponent("Stock debe ser un entero no negativo.")}`);
  }

  if (typeof skuRaw !== "string" || skuRaw.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("El SKU es obligatorio.")}`);
  }

  if (typeof statusRaw !== "string" || !VALID_STATUSES.includes(statusRaw as ProductStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Estado no válido.")}`);
  }

  const tags =
    typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

  const result = await createProduct({
    name,
    slug: typeof slug === "string" ? slug : undefined,
    description: typeof description === "string" ? description : undefined,
    shortDescription: typeof shortDescription === "string" ? shortDescription : undefined,
    category: typeof category === "string" ? category : undefined,
    tags,
    status: statusRaw as ProductStatus,
    isFeatured,
    priceCents,
    stock,
    sku: skuRaw,
  });

  if (!result.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.product.create",
    entity: "product",
    entityId: result.id,
    payload: { name, slug: result.slug, status: statusRaw },
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda");

  redirect(`${returnTo}?ok=${encodeURIComponent("Producto creado.")}`);
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || productId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Producto no válido.")}`);
  }

  const result = await deleteProduct(productId);

  if (!result.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.product.delete",
    entity: "product",
    entityId: productId,
    payload: {},
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda");

  redirect(`${returnTo}?ok=${encodeURIComponent("Producto eliminado.")}`);
}
