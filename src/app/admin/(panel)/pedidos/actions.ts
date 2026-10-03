"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteOrder,
  getProductSlugsForOrder,
  updateOrderStatus,
} from "@/lib/data/admin-order-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";
import { writeAuditLog } from "@/lib/data/admin-repository";
import type { OrderStatus } from "@/lib/domain/types";

const VALID_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

function safeReturnTo(raw: FormDataEntryValue | null): string {
  if (typeof raw === "string" && raw.startsWith("/admin/pedidos")) return raw;
  return "/admin/pedidos";
}

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();

  if (!session) {
    redirect("/admin/login");
  }

  const orderIdRaw = formData.get("orderId");
  const statusRaw = formData.get("status");
  const noteRaw = formData.get("note");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof orderIdRaw !== "string" || typeof statusRaw !== "string") {
    redirect(`${returnTo}?error=${encodeURIComponent("Datos incompletos.")}`);
  }

  if (!VALID_STATUSES.includes(statusRaw as OrderStatus)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Estado no válido.")}`);
  }

  const note = typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : undefined;

  const result = await updateOrderStatus({
    orderId: orderIdRaw,
    status: statusRaw as OrderStatus,
    changedBy: session.email,
    note,
  });

  if (!result.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderIdRaw}`);
  revalidatePath("/");
  revalidatePath("/tienda");

  const slugs = await getProductSlugsForOrder(orderIdRaw);
  for (const slug of slugs) {
    revalidatePath(`/producto/${slug}`);
  }

  redirect(`${returnTo}?ok=${encodeURIComponent("Estado actualizado.")}`);
}

export async function deleteOrderAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();

  if (!session) {
    redirect("/admin/login");
  }

  const orderIdRaw = formData.get("orderId");
  const returnTo = safeReturnTo(formData.get("returnTo"));

  if (typeof orderIdRaw !== "string") {
    redirect(`${returnTo}?error=${encodeURIComponent("Pedido no válido.")}`);
  }

  const result = await deleteOrder(orderIdRaw);

  if (!result.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  await writeAuditLog({
    userId: session.adminId,
    action: "order.delete",
    entity: "order",
    entityId: orderIdRaw,
    payload: {},
  });

  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderIdRaw}`);
  revalidatePath("/");
  revalidatePath("/tienda");

  const slugs = await getProductSlugsForOrder(orderIdRaw);
  for (const slug of slugs) {
    revalidatePath(`/producto/${slug}`);
  }

  redirect(`${returnTo}?ok=${encodeURIComponent("Pedido eliminado.")}`);
}
