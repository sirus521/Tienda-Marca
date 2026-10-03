"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createTag, deleteTag, updateCollectionFlags } from "@/lib/data/admin-taxonomy-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

function slugifyTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function updateCollectionFlagsAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const id = formData.get("id");
  const isPublished = formData.get("isPublished") === "on";
  const isFeatured = formData.get("isFeatured") === "on";
  const returnTo =
    typeof formData.get("returnTo") === "string"
      ? String(formData.get("returnTo"))
      : "/admin/colecciones";

  if (typeof id !== "string" || id.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Colección no válida.")}`);
  }

  await updateCollectionFlags({ id, isPublished, isFeatured });

  revalidatePath("/admin/colecciones");
  revalidatePath("/");
  revalidatePath("/tienda");

  redirect(`${returnTo}?ok=${encodeURIComponent("Colección actualizada.")}`);
}

export async function createTagAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const name = formData.get("name");
  const returnTo =
    typeof formData.get("returnTo") === "string"
      ? String(formData.get("returnTo"))
      : "/admin/etiquetas";

  if (typeof name !== "string" || name.trim().length < 2) {
    redirect(
      `${returnTo}?error=${encodeURIComponent("El nombre debe tener al menos 2 caracteres.")}`,
    );
  }

  const slug = slugifyTag(name.trim());

  if (!slug) {
    redirect(`${returnTo}?error=${encodeURIComponent("No se pudo generar un slug válido.")}`);
  }

  try {
    await createTag({ name: name.trim(), slug });
  } catch {
    redirect(`${returnTo}?error=${encodeURIComponent("Ya existe una etiqueta con ese slug.")}`);
  }

  revalidatePath("/admin/etiquetas");
  redirect(`${returnTo}?ok=${encodeURIComponent("Etiqueta creada.")}`);
}

export async function deleteTagAction(formData: FormData): Promise<void> {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const id = formData.get("id");
  const returnTo =
    typeof formData.get("returnTo") === "string"
      ? String(formData.get("returnTo"))
      : "/admin/etiquetas";

  if (typeof id !== "string" || id.trim() === "") {
    redirect(`${returnTo}?error=${encodeURIComponent("Etiqueta no válida.")}`);
  }

  await deleteTag(id);

  revalidatePath("/admin/etiquetas");
  redirect(`${returnTo}?ok=${encodeURIComponent("Etiqueta borrada.")}`);
}
