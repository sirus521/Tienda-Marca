import { and, desc, eq, lt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { adminAccounts, adminUsers, auditLogs, sessionTokens, settings } from "@/lib/db/schema";
import { normalizeEmail } from "@/lib/domain/auth";
import type { AdminRole, AdminSession, AdminUser, AuditEntry } from "@/lib/domain/types";

/**
 * Repositorio de administración
 * ============================================================================
 * Lee y escribe admins, sesiones, bitácora de auditoría y ajustes.
 *
 * LA MITAD QUE SÍ ES SEGURIDAD ESTÁ AQUÍ
 * `findAdminByEmail` no pide la contraseña: devuelve solo lo necesario para
 * identificarse, y el hash se busca aparte con `findPasswordHash`. Ninguna
 * función de este archivo devuelve un hash a la capa de presentación.
 *
 * LO QUE ESTÁ FUERA DE AQUÍ A PROPÓSITO
 * Nada de cookies ni de Next: eso vive en `app/admin/login/actions.ts`. Este
 * archivo habla con D1 y devuelve datos; quién está conectado es otra capa.
 */

export type NewAuditEntry = {
  userId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  /** Se guarda como JSON. Objeto plano; nunca una contraseña ni un token. */
  payload?: Record<string, unknown> | null;
};

/* ---------------------------------------------------------------------
   ADMINS
   --------------------------------------------------------------------- */

/**
 * Busca un admin por correo.
 *
 * No filtra por `isActive`: el login necesita saber que la cuenta existe aunque
 * esté desactivada, porque el mensaje que ve quien intenta entrar tiene que ser
 * "tu cuenta está desactivada", no "no existe". Decir "no existe" sería además
 * una forma de enumerar qué correos son admins.
 */
export async function findAdminByEmail(email: string): Promise<AdminUser | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, normalizeEmail(email)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Devuelve el hash de la contraseña de un admin.
 *
 * Vive en `admin_accounts` y no en `admin_users` porque una cuenta puede tener
 * varias filas —una por proveedor— y esa separación es lo que permitiría añadir
 * Google o GitHub después sin mover columnas.
 *
 * Se filtra por `providerId: "credential"`, que es lo que distingue una
 * contraseña de un token de OAuth. Filtrar por `accountId` sería más corto y
 * acabaría mezclando credenciales con proveedores.
 */
export async function findPasswordHash(userId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db
    .select({ password: adminAccounts.password })
    .from(adminAccounts)
    .where(and(eq(adminAccounts.userId, userId), eq(adminAccounts.providerId, "credential")))
    .limit(1);

  return rows[0]?.password ?? null;
}

/**
 * Crea un admin con su credencial de contraseña.
 *
 * `onConflictDoNothing` en la cabecera: volver a ejecutar el alta con un correo
 * que ya existe no debe reescribir la contraseña de alguien que ya está
 * operando con ella. Si el correo está ocupado se devuelve el error y el script
 * lo avisa, en vez de dejar una cuenta viva con una contraseña que su dueño
 * nunca eligió.
 *
 * El alta marca `emailVerified: true` porque quien la ejecuta tiene acceso a la
 * base; nadie va a pasar por el correo para demostrar que sabe usar un buzón.
 */
export async function createAdminWithPassword(input: {
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const email = normalizeEmail(input.email);

  const inserted = await db
    .insert(adminUsers)
    .values({
      id,
      name: input.name,
      email,
      emailVerified: true,
      role: input.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing()
    .returning({ id: adminUsers.id });

  if (inserted.length === 0) {
    return { ok: false, error: `Ya existe un admin con el correo ${email}.` };
  }

  /* La credencial va en un `insert` aparte porque solo tiene sentido si la
     cabecera se acaba de crear. Si este insert falla, el admin queda sin
     contraseña y no puede entrar: es un fallo real y el script lo reporta. */
  await db.insert(adminAccounts).values({
    id: crypto.randomUUID(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: input.passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  return { ok: true, id };
}

/** Marca el último acceso. */
export async function touchLastLogin(userId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db
    .update(adminUsers)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(adminUsers.id, userId));
}

/** ¿La cuenta está activa? `isActive: false` es una baja sin borrar nada. */
export async function isAdminActive(userId: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .select({ isActive: adminUsers.isActive })
    .from(adminUsers)
    .where(eq(adminUsers.id, userId))
    .limit(1);

  return rows[0]?.isActive === true;
}

/* ---------------------------------------------------------------------
   SESIONES
   --------------------------------------------------------------------- */

/**
 * Abre una sesión.
 *
 * Guarda `hashSessionToken(token)` y no el token: el comentario en
 * `domain/auth` explica por qué. El token en claro solo existe un instante, en
 * la cookie que sale hacia el navegador.
 */
export async function createSession(input: {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();

  await db.insert(sessionTokens).values({
    id: crypto.randomUUID(),
    token: input.tokenHash,
    userId: input.userId,
    expiresAt: input.expiresAt,
    ipAddress: input.ipAddress ?? null,
    /* 255 y no `text`: el `user_agent` de un navegador real puede pasar de eso
       y truncarlo en la base, no en el insert, convierte un dato largo en un
       error. */
    userAgent: input.userAgent ? input.userAgent.slice(0, 255) : null,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Resuelve una sesión a su admin.
 *
 * Devuelve `null` si el token no existe, si expiró o si el admin está
 * desactivado. Los tres casos son indistinguibles para quien llama a propósito:
 * poder distinguir "el token existe pero caducó" es información que no hace
 * falta regalar.
 *
 * El filtro por `expires_at` va en SQL y no comparando en JavaScript para que
 * la base descarte sola las filas caducadas y no haya que traerlas todas.
 */
export async function findSessionByTokenHash(tokenHash: string): Promise<AdminSession | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const rows = await db
    .select({
      sessionId: sessionTokens.id,
      expiresAt: sessionTokens.expiresAt,
      adminId: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
    })
    .from(sessionTokens)
    .innerJoin(adminUsers, eq(sessionTokens.userId, adminUsers.id))
    .where(and(eq(sessionTokens.token, tokenHash), sql`${sessionTokens.expiresAt} > ${now}`))
    .limit(1);

  const row = rows[0];
  if (!row?.isActive) return null;

  return {
    sessionId: row.sessionId,
    adminId: row.adminId,
    email: row.email,
    name: row.name,
    role: row.role,
    expiresAt: row.expiresAt,
  };
}

/**
 * Cierra todas las sesiones de un admin.
 *
 * Todas, no solo la actual: en un panel de administración es lo razonable cuando
 * alguien cierra sesión desde un equipo compartido, y "cerrar sesión en todas
 * partes" es una acción que un dueño esperaría encontrar.
 */
export async function deleteSessionsForUser(userId: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessionTokens).where(eq(sessionTokens.userId, userId));
}

/** Cierra una sesión concreta —la que se está usando—. */
export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
  const db = await getDb();
  await db.delete(sessionTokens).where(eq(sessionTokens.token, tokenHash));
}

/**
 * Borra las sesiones caducadas.
 *
 * Distinto de filtrar en cada lectura: eso decide qué sesión es válida, esto
 * recoge las filas. `session_tokens` no tiene ningún proceso que las borre solo
 * y la tabla crecería sin control.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const db = await getDb();
  const now = new Date().toISOString();
  const deleted = await db.delete(sessionTokens).where(lt(sessionTokens.expiresAt, now));
  /* `meta.changes`, no `rowsAffected`: en D1 el conteo de filas afectadas vive
     en `meta`, y `D1Result` no expone un `rowsAffected` como sí hace el driver
     de Node. */
  return deleted.meta?.changes ?? 0;
}

/* ---------------------------------------------------------------------
   BITÁCORA
   --------------------------------------------------------------------- */

/**
 * Deja rastro de una acción del panel.
 *
 * Existe para responder "¿quién cambió el precio de esto?" sin instrumentar cada
 * pantalla. Por eso guarda el antes/después en `payload`: el qué sin el cómo no
 * sirve de nada.
 *
 * `userId` admite `null` a propósito: hay acciones que ocurren sin sesión —un
 * login rechazado— y borrarlas de la bitácora las haría invisibles.
 */
export async function writeAuditLog(entry: NewAuditEntry): Promise<void> {
  const db = await getDb();
  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    userId: entry.userId,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    payload: entry.payload ? JSON.stringify(entry.payload) : null,
    createdAt: new Date().toISOString(),
  });
}

/** Movimientos recientes, del más nuevo al más viejo. */
export async function listRecentAuditLogs(limit = 50): Promise<AuditEntry[]> {
  const db = await getDb();
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

/* ---------------------------------------------------------------------
   AJUSTES
   ---------------------------------------------------------------------
   `settings.value` es TEXT con default `"{}"`: el proyecto lo piensa como
   JSON. Eso permite guardar un grupo de ajustes relacionados bajo una clave en
   vez de inventar una fila por ajuste, y obliga a que el valor tenga forma
   declarada en un solo sitio.
   --------------------------------------------------------------------- */

/** Lectura tolerante: un valor que no es JSON válido devuelve el default. */
export async function readSettings<T extends Record<string, unknown>>(fallback: T): Promise<T> {
  const db = await getDb();
  const rows = await db.select().from(settings);
  const merged = { ...fallback } as Record<string, unknown>;

  for (const row of rows) {
    try {
      const parsed: unknown = JSON.parse(row.value);
      /* Solo se acepta un objeto. Un ajuste que sea un número o una lista
         suplantaría al grupo entero, y un `null` de más tiraría abajo el resto
         de ajustes de esa clave. */
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(merged, parsed as Record<string, unknown>);
      }
    } catch {
      /* Valor corrupto: se ignora y se queda el default. Romper el panel entero
         por un ajuste mal guardado sería peor que perder ese ajuste. */
    }
  }

  return merged as T;
}

/** Guarda un grupo de ajustes bajo una clave. */
export async function writeSettings(
  key: string,
  value: Record<string, unknown>,
  now = new Date().toISOString(),
): Promise<void> {
  const db = await getDb();
  await db
    .insert(settings)
    .values({ key, value: JSON.stringify(value), updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(value), updatedAt: now },
    });
}

/** Lee un único ajuste por clave y lo parsea como JSON (objeto). */
export async function readSettingValue(key: string): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const row = rows[0];
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(row.value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* valor corrupto: se trata como inexistente */
  }
  return null;
}
