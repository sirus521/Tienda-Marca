"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { writeSettings } from "@/lib/data/admin-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

/**
 * Ajustes
 * ============================================================================
 * Guarda un grupo de configuración bajo una clave en `settings`. El admin
 * escribe JSON porque los valores son heterogéneos; la UI pública los parsea
 * después. No acepta primitivas sueltas: settings.value siempre es un objeto.
 */
export async function updateSettingsAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const key = formData.get("key");
  const valueRaw = formData.get("value");
  const returnTo =
    typeof formData.get("returnTo") === "string"
      ? String(formData.get("returnTo"))
      : "/admin/ajustes";

  if (typeof key !== "string" || key.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("La clave no puede estar vacía.")}`);
  }

  if (typeof valueRaw !== "string") {
    redirect(`${returnTo}?error=${encodeURIComponent("El valor debe ser JSON.")}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(valueRaw);
  } catch {
    redirect(`${returnTo}?error=${encodeURIComponent("JSON inválido.")}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    redirect(`${returnTo}?error=${encodeURIComponent("El valor debe ser un objeto JSON.")}`);
  }

  await writeSettings(key.trim(), parsed as Record<string, unknown>);

  revalidatePath("/admin/ajustes");
  redirect(`${returnTo}?ok=${encodeURIComponent("Ajuste guardado.")}`);
}

/**
 * Guarda los ajustes de marca editables (WhatsApp, saludo, correo, Instagram,
 * ubicación, envío gratis y prefijo de pedido) bajo la clave `brand`.
 */
export async function saveBrandSettingsAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const whatsapp = formData.get("whatsapp");
  const whatsappGreeting = formData.get("whatsappGreeting");
  const email = formData.get("email");
  const instagram = formData.get("instagram");
  const location = formData.get("location");
  const freeShippingRaw = formData.get("freeShippingThresholdCents");
  const orderPrefix = formData.get("orderPrefix");

  const freeShipping = Number(freeShippingRaw);
  const freeShippingThresholdCents =
    Number.isFinite(freeShipping) && freeShipping >= 0 ? freeShipping : undefined;

  await writeSettings("brand", {
    whatsapp: typeof whatsapp === "string" ? whatsapp.trim() : "",
    whatsappGreeting: typeof whatsappGreeting === "string" ? whatsappGreeting.trim() : "",
    email: typeof email === "string" ? email.trim() : "",
    instagram: typeof instagram === "string" ? instagram.trim() : "",
    location: typeof location === "string" ? location.trim() : "",
    ...(freeShippingThresholdCents !== undefined ? { freeShippingThresholdCents } : {}),
    orderPrefix:
      typeof orderPrefix === "string" && orderPrefix.trim() !== "" ? orderPrefix.trim() : undefined,
  });

  revalidatePath("/admin/ajustes");
  revalidatePath("/");
  revalidatePath("/tienda");
  redirect(`/admin/ajustes?ok=${encodeURIComponent("Marca guardada.")}`);
}
