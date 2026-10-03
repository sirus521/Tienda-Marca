"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getProductSlugsForOrder, updateOrderStatus } from "@/lib/data/admin-order-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";
import type { OrderStatus } from "@/lib/domain/types";

const VALID_STATUSES: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

/**
 * Cambiar estado de pedido
 * ============================================================================
 * Server Action. No valida sesión de forma gratuita: el layout la exige, pero
 * aquí también se comprueba porque una action puede invocarse sola. La regla
 * de Spring es que el layout no sustituye a la validación en la acción.
 */
export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();

  if (!session) {
    redirect("/admin/login");
  }

  const orderIdRaw = formData.get("orderId");
  const statusRaw = formData.get("status");
  const noteRaw = formData.get("note");

  if (typeof orderIdRaw !== "string" || typeof statusRaw !== "string") {
    redirect(`/admin/pedidos?error=${encodeURIComponent("Datos incompletos.")}`);
  }

  if (!VALID_STATUSES.includes(statusRaw as OrderStatus)) {
    redirect(`/admin/pedidos?error=${encodeURIComponent("Estado no válido.")}`);
  }

  const note = typeof noteRaw === "string" && noteRaw.trim() !== "" ? noteRaw.trim() : undefined;

  const result = await updateOrderStatus({
    orderId: orderIdRaw,
    status: statusRaw as OrderStatus,
    changedBy: session.email,
    note,
  });

  if (!result.ok) {
    redirect(`/admin/pedidos/${orderIdRaw}?error=${encodeURIComponent(result.error)}`);
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

  redirect(`/admin/pedidos/${orderIdRaw}?ok=${encodeURIComponent("Estado actualizado.")}`);
}
