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
