import { cookies } from "next/headers";

import { findSessionByTokenHash } from "@/lib/data/admin-repository";
import { hashSessionToken, SESSION_COOKIE } from "@/lib/domain/auth";
import type { AdminSession } from "@/lib/domain/types";

/**
 * Sesión activa del admin
 * ============================================================================
 * Puente entre la cookie HTTP y los datos resueltos desde D1.
 *
 * POR QUÉ NO SE VALIDA AQUÍ DIRECTAMENTE
 * Esta función solo observa. Quien decide si redirige, qué hace falta y cómo se
 * responde es la página o la Server Action que la llama. Si `getAdminSession`
 * redirigiera por su cuenta, cualquier lectura de sesión fuera del panel
 * terminaría navegando al login, y ese es el tipo de efecto sorpresa que luego
 * se atribuye al framework y no a una función.
 */

/**
 * Devuelve la sesión válida del admin o `null`.
 *
 * `null` cubre tres cosas indistinguibles para quien llama: no hay cookie, el
 * token no existe, o expiró. No conviene distinguirlas en pantalla: poder saber
 * que un token existe pero caducó es información que no hace falta regalar.
 */
export async function getAdminSessionFromRequest(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  return findSessionByTokenHash(hashSessionToken(token));
}
