"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
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
