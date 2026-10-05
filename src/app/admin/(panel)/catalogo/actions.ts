"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCloudflareContext } from "@opennextjs/cloudflare";

import {
  addOption,
  addOptionValue,
  addProductImage,
  addVariant,
  createProduct,
  deleteProduct,
  deleteProductImage,
  deleteVariant,
  getAdminProductDetail,
  getProductSlugForVariant,
  getVariantPriceCents,
  removeOption,
  removeOptionValue,
  setPrimaryImage,
  updateProduct,
  updateProductStatus,
  updateVariantDetails,
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

/** Solo el owner puede borrar, cambiar estatus o tocar el precio. */
function requireOwner(role: string | undefined): role is "owner" {
  return role === "owner";
}

function forbidEditor(returnTo: string): never {
  redirect(
    `${returnTo}?error=${encodeURIComponent("No tienes permiso para esa acción (requiere rol de owner).")}`,
  );
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

  const submittedPriceCents = typeof priceRaw === "string" ? parsePriceInput(priceRaw) : null;
  const storedPriceCents = await getVariantPriceCents(variantId);
  const priceChanged =
    submittedPriceCents !== null &&
    storedPriceCents !== null &&
    submittedPriceCents !== storedPriceCents;

  /* RBAC: el precio solo lo toca el owner. Si un editor envía un precio
     distinto, bloqueamos toda la acción (ni siquiera el stock) para que el
     cambio no pase desapercibido. */
  if (priceChanged && !requireOwner(session.role)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Solo el owner puede cambiar el precio.")}`);
  }

  await updateVariantStock(variantId, stock);
  if (requireOwner(session.role) && submittedPriceCents !== null && storedPriceCents !== null) {
    await updateVariantPrice(variantId, submittedPriceCents);
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.variant.update",
    entity: "variant",
    entityId: variantId,
    payload: { stock, priceCents: submittedPriceCents ?? storedPriceCents },
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

  if (!requireOwner(session.role)) forbidEditor(returnTo);

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

  if (!requireOwner(session.role)) forbidEditor(returnTo);

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

/* ==================================================================
   EDITOR DE PRODUCTO (Fase 4)
   ================================================================== */

export async function updateProductAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || productId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Producto no válido.")}`);
  }

  const name = formData.get("name");
  const slugRaw = formData.get("slug");
  const shortDescription = formData.get("shortDescription");
  const description = formData.get("description");
  const category = formData.get("category");
  const tagsRaw = formData.get("tags");
  const statusRaw = formData.get("status");
  const isFeatured = formData.get("isFeatured") === "on";
  const seoTitle = formData.get("seoTitle");
  const seoDescription = formData.get("seoDescription");

  if (typeof name !== "string" || name.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("El nombre es obligatorio.")}`);
  }

  const current = await getAdminProductDetail(productId);
  if (!current) {
    redirect(`${returnTo}?error=${encodeURIComponent("El producto no existe.")}`);
  }

  /* RBAC: estado y destacado son solo owner. */
  const wantsStatusChange = typeof statusRaw === "string" && statusRaw !== current.status;
  const wantsFeaturedChange = isFeatured !== current.isFeatured;
  if (!requireOwner(session.role) && (wantsStatusChange || wantsFeaturedChange)) {
    redirect(
      `${returnTo}?error=${encodeURIComponent("Solo el owner puede cambiar el estado o destacar el producto.")}`,
    );
  }

  const tags =
    typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

  const result = await updateProduct(productId, {
    name,
    slug: typeof slugRaw === "string" ? slugRaw : undefined,
    shortDescription: typeof shortDescription === "string" ? shortDescription : undefined,
    description: typeof description === "string" ? description : undefined,
    category: typeof category === "string" ? category : undefined,
    tags,
    status:
      requireOwner(session.role) &&
      typeof statusRaw === "string" &&
      VALID_STATUSES.includes(statusRaw as ProductStatus)
        ? (statusRaw as ProductStatus)
        : current.status,
    isFeatured: requireOwner(session.role) ? isFeatured : current.isFeatured,
    seoTitle: typeof seoTitle === "string" ? seoTitle : null,
    seoDescription: typeof seoDescription === "string" ? seoDescription : null,
  });

  if (!result.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.product.update",
    entity: "product",
    entityId: productId,
    payload: { name, slug: result.slug },
  });

  revalidatePath("/admin/catalogo");
  revalidatePath("/");
  revalidatePath("/tienda");
  revalidatePath(`/producto/${current.slug}`);
  if (result.slug !== current.slug) revalidatePath(`/producto/${result.slug}`);

  redirect(`${returnTo}?ok=${encodeURIComponent("Producto actualizado.")}`);
}

/* ---------------- Opciones (ejes) ---------------- */

export async function addOptionAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const name = formData.get("name");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || typeof name !== "string" || name.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Eje no válido.")}`);
  }

  const result = await addOption(productId, name);
  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo agregar.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.option.create",
    entity: "option",
    entityId: result.id,
    payload: { name },
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Eje agregado.")}`);
}

export async function removeOptionAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const optionId = formData.get("optionId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof optionId !== "string" || optionId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Eje no válido.")}`);
  }

  const result = await removeOption(optionId);
  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo quitar.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.option.delete",
    entity: "option",
    entityId: optionId,
    payload: {},
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Eje eliminado.")}`);
}

export async function addOptionValueAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const optionId = formData.get("optionId");
  const value = formData.get("value");
  const hexColor = formData.get("hexColor");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof optionId !== "string" || typeof value !== "string" || value.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Valor no válido.")}`);
  }

  const result = await addOptionValue(
    optionId,
    value,
    typeof hexColor === "string" && hexColor.trim() !== "" ? hexColor.trim() : null,
  );
  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo agregar.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.option_value.create",
    entity: "option_value",
    entityId: result.id,
    payload: { value },
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Valor agregado.")}`);
}

export async function removeOptionValueAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const optionValueId = formData.get("optionValueId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof optionValueId !== "string" || optionValueId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Valor no válido.")}`);
  }

  const result = await removeOptionValue(optionValueId);
  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo quitar.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.option_value.delete",
    entity: "option_value",
    entityId: optionValueId,
    payload: {},
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Valor eliminado.")}`);
}

/* ---------------- Variantes ---------------- */

export async function addVariantAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const skuRaw = formData.get("sku");
  const priceRaw = formData.get("price");
  const stockRaw = formData.get("stock");
  const weightRaw = formData.get("weightGrams");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || typeof skuRaw !== "string" || skuRaw.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Variante no válida.")}`);
  }

  const priceCents = typeof priceRaw === "string" ? parsePriceInput(priceRaw) : null;
  if (priceCents === null) redirect(`${returnTo}?error=${encodeURIComponent("Precio no válido.")}`);
  const stock = Number(stockRaw);
  if (!Number.isInteger(stock) || stock < 0) {
    redirect(`${returnTo}?error=${encodeURIComponent("Stock no válido.")}`);
  }

  /* RBAC: quien crea una variante con precio distinto al owner es siempre owner
     en el sentido de que crear una variante ya fija su precio. El owner es el
     único que puede fijar precio inicial distinto; editor puede crear variantes
     solo si el precio coincide con el de la primera variante existente. */
  const detail = await getAdminProductDetail(productId);
  if (!detail) redirect(`${returnTo}?error=${encodeURIComponent("Producto no existe.")}`);

  if (!requireOwner(session.role) && detail.variants.length > 0) {
    const basePrice = detail.variants[0]?.priceCents;
    if (basePrice !== undefined && priceCents !== basePrice) {
      redirect(
        `${returnTo}?error=${encodeURIComponent("Solo el owner puede fijar un precio distinto al de las demás variantes.")}`,
      );
    }
  }

  const optionValues: Record<string, string> = {};
  for (const option of detail.options) {
    const value = formData.get(`opt_${option.name}`);
    if (typeof value === "string" && value.trim() !== "" && value.trim() !== "(sin)") {
      optionValues[option.name] = value.trim();
    }
  }

  const weightGrams =
    typeof weightRaw === "string" && weightRaw.trim() !== "" ? Number(weightRaw) : null;
  const result = await addVariant(productId, {
    sku: skuRaw,
    optionValues,
    priceCents,
    stock,
    weightGrams: Number.isFinite(weightGrams) ? weightGrams : null,
  });
  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo crear.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.variant.create",
    entity: "variant",
    entityId: result.id,
    payload: { sku: skuRaw, priceCents, stock },
  });
  revalidatePath(returnTo);
  revalidatePath(`/producto/${detail.slug}`);
  redirect(`${returnTo}?ok=${encodeURIComponent("Variante creada.")}`);
}

export async function deleteVariantAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const variantId = formData.get("variantId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof variantId !== "string" || variantId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Variante no válida.")}`);
  }

  await deleteVariant(variantId);
  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.variant.delete",
    entity: "variant",
    entityId: variantId,
    payload: {},
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Variante eliminada.")}`);
}

export async function updateVariantDetailsAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const variantId = formData.get("variantId");
  const weightRaw = formData.get("weightGrams");
  const imageId = formData.get("imageId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof variantId !== "string" || variantId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Variante no válida.")}`);
  }

  const weightGrams =
    typeof weightRaw === "string" && weightRaw.trim() !== "" ? Number(weightRaw) : null;
  await updateVariantDetails(variantId, {
    weightGrams: Number.isFinite(weightGrams) ? weightGrams : null,
    imageId: typeof imageId === "string" && imageId.trim() !== "" ? imageId.trim() : null,
  });

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.variant.update",
    entity: "variant",
    entityId: variantId,
    payload: { weightGrams, imageId },
  });
  revalidatePath(returnTo);
  redirect(`${returnTo}?ok=${encodeURIComponent("Variante actualizada.")}`);
}

/* ---------------- Imágenes / R2 ---------------- */

export async function addProductImageAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const productId = formData.get("productId");
  const file = formData.get("file");
  const altRaw = formData.get("alt");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof productId !== "string" || productId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Producto no válido.")}`);
  }

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${returnTo}?error=${encodeURIComponent("Sube una imagen.")}`);
  }

  const CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
  if (!CONTENT_TYPES.includes(file.type)) {
    redirect(
      `${returnTo}?error=${encodeURIComponent("Formato no soportado. Usa JPG, PNG, WebP, AVIF o GIF.")}`,
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    redirect(`${returnTo}?error=${encodeURIComponent("Máximo 5 MB por imagen.")}`);
  }

  const ext = file.type === "image/jpeg" ? "jpg" : (file.type.split("/")[1] ?? "bin");
  const key = `${productId}/${crypto.randomUUID()}.${ext}`;

  const { env } = await getCloudflareContext({ async: true });
  if (!env.PRODUCT_IMAGES_R2_BUCKET || !env.R2_PUBLIC_URL) {
    redirect(
      `${returnTo}?error=${encodeURIComponent("R2 no configurado: crea el bucket y pon R2_PUBLIC_URL.")}`,
    );
  }

  await env.PRODUCT_IMAGES_R2_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  const result = await addProductImage(productId, {
    url,
    alt: typeof altRaw === "string" ? altRaw : "",
    width: 0,
    height: 0,
  });

  if (!result.ok)
    redirect(`${returnTo}?error=${encodeURIComponent(result.error ?? "No se pudo registrar.")}`);

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.image.create",
    entity: "image",
    entityId: result.id,
    payload: { url },
  });
  revalidatePath(returnTo);
  revalidatePath("/");
  revalidatePath("/tienda");
  redirect(`${returnTo}?ok=${encodeURIComponent("Imagen subida.")}`);
}

export async function setPrimaryImageAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const imageId = formData.get("imageId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof imageId !== "string" || imageId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Imagen no válida.")}`);
  }

  await setPrimaryImage(imageId);
  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.image.primary",
    entity: "image",
    entityId: imageId,
    payload: {},
  });
  revalidatePath(returnTo);
  revalidatePath("/");
  revalidatePath("/tienda");
  redirect(`${returnTo}?ok=${encodeURIComponent("Imagen principal actualizada.")}`);
}

export async function deleteProductImageAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const imageId = formData.get("imageId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof imageId !== "string" || imageId.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Imagen no válida.")}`);
  }

  const result = await deleteProductImage(imageId);

  /* Borra también el objeto de R2 si está bajo el dominio público configurado. */
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (result.url && env.R2_PUBLIC_URL && env.PRODUCT_IMAGES_R2_BUCKET) {
      const base = env.R2_PUBLIC_URL.replace(/\/$/, "");
      if (result.url.startsWith(base)) {
        await env.PRODUCT_IMAGES_R2_BUCKET.delete(result.url.slice(base.length + 1));
      }
    }
  } catch {
    /* Si R2 falla, al menos la fila quedó eliminada. */
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "catalog.image.delete",
    entity: "image",
    entityId: imageId,
    payload: {},
  });
  revalidatePath(returnTo);
  revalidatePath("/");
  revalidatePath("/tienda");
  redirect(`${returnTo}?ok=${encodeURIComponent("Imagen eliminada.")}`);
}
