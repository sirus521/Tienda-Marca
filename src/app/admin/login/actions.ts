"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSession,
  findAdminByEmail,
  findPasswordHash,
  findSessionByTokenHash,
  isAdminActive,
  touchLastLogin,
  writeAuditLog,
  deleteSessionByTokenHash,
} from "@/lib/data/admin-repository";
import {
  generateSessionToken,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  sessionExpiry,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  verifyPassword,
} from "@/lib/domain/auth";
import type { LoginState } from "./state";

const GENERIC_AUTH_ERROR = "Correo o contraseña incorrectos.";

/**
 * Entrada al panel
 * ============================================================================
 * Server actions de login y logout. El diseño aquí es deliberadamente simple:
 * se valida, se comprueba la contraseña contra el hash, y se crea o se borra la
 * sesión. No hay OAuth, no hay "olvidaste tu contraseña", y no hay un segundo
 * factor que la página de login tenga que concertar.
 *
 * POR QUÉ EL ERROR ES GENÉRICO
 * "Ese correo no existe" y "la contraseña es incorrecta" no son dos maneras de
 * decir lo mismo: son dos pistas distintas sobre qué correos son administradores.
 * Un solo mensaje cubre los dos casos.
 */

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");
  const nextRaw = formData.get("next");

  const fieldErrors: Record<string, string> = {};

  if (typeof emailRaw !== "string" || !isValidEmail(emailRaw)) {
    fieldErrors.email = "Escribe un correo válido.";
  }

  if (typeof passwordRaw !== "string" || passwordRaw.length === 0) {
    fieldErrors.password = "La contraseña es obligatoria.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Revisa los datos marcados.", fieldErrors };
  }

  // TypeScript no sabe que `fieldErrors` vacío implica strings válidos, así que
  // se estrecha explícitamente en vez de poner un `!`.
  const email = typeof emailRaw === "string" ? normalizeEmail(emailRaw) : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  const admin = await findAdminByEmail(email);

  /* ---------------------------------------------------------------------
     1. NO EXISTE
     --------------------------------------------------------------------- */
  if (!admin) {
    await writeAuditLog({
      userId: null,
      action: "admin.login.failed",
      entity: "admin",
      entityId: null,
      payload: { email, reason: "not_found" },
    });
    return { status: "error", message: GENERIC_AUTH_ERROR };
  }

  /* ---------------------------------------------------------------------
     2. EXISTE PERO NO TIENE CONTRASEÑA
     --------------------------------------------------------------------- */
  const passwordHash = await findPasswordHash(admin.id);

  if (!passwordHash) {
    await writeAuditLog({
      userId: admin.id,
      action: "admin.login.failed",
      entity: "admin",
      entityId: admin.id,
      payload: { email, reason: "no_password_hash" },
    });
    return { status: "error", message: GENERIC_AUTH_ERROR };
  }

  /* ---------------------------------------------------------------------
     3. VERIFICAR CONTRASEÑA
     --------------------------------------------------------------------- */
  const passwordValid = await verifyPassword(password, passwordHash);

  if (!passwordValid) {
    await writeAuditLog({
      userId: admin.id,
      action: "admin.login.failed",
      entity: "admin",
      entityId: admin.id,
      payload: { email, reason: "wrong_password" },
    });
    return { status: "error", message: GENERIC_AUTH_ERROR };
  }

  /* ---------------------------------------------------------------------
     4. CUENTA DESACTIVADA
     --------------------------------------------------------------------- */
  const active = await isAdminActive(admin.id);

  if (!active) {
    await writeAuditLog({
      userId: admin.id,
      action: "admin.login.failed",
      entity: "admin",
      entityId: admin.id,
      payload: { email, reason: "inactive" },
    });
    return { status: "error", message: "Tu cuenta está desactivada." };
  }

  /* ---------------------------------------------------------------------
     5. ABRIR SESIÓN
     --------------------------------------------------------------------- */
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiry();

  const requestHeaders = await headers();
  const ipAddress =
    requestHeaders.get("cf-connecting-ip") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  const userAgent = requestHeaders.get("user-agent");

  await createSession({ tokenHash, userId: admin.id, expiresAt, ipAddress, userAgent });
  await touchLastLogin(admin.id);

  await writeAuditLog({
    userId: admin.id,
    action: "admin.login",
    entity: "admin",
    entityId: admin.id,
    payload: { ipAddress, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
    expires: new Date(expiresAt),
  });

  const target = typeof nextRaw === "string" ? safeNext(nextRaw) : "/admin";
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const session = await findSessionByTokenHash(hashSessionToken(token));
    if (session) {
      await writeAuditLog({
        userId: session.adminId,
        action: "admin.logout",
        entity: "admin",
        entityId: session.adminId,
      });
    }

    await deleteSessionByTokenHash(hashSessionToken(token));
    cookieStore.delete(SESSION_COOKIE);
  }

  redirect("/admin/login");
}

/* ============================================================================
   AYUDANTES
   ============================================================================ */

/**
 * Valida que la redirección elegida sea algo que el panel controle.
 *
 * Sin esta comprobación, un `?next=https://sitio.mal` llevaría a la persona que
 * acaba de entrar a un lugar que no es la tienda. El panel solo tiene rutas que
 * empiezan por `/admin`, y ahí se limita todo.
 */
function safeNext(next: string): string {
  if (!next.startsWith("/admin")) return "/admin";
  if (next.startsWith("//")) return "/admin";
  if (next.startsWith("/admin/login")) return "/admin";
  return next;
}
