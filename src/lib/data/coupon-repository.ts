import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { coupons } from "@/lib/db/schema";

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  expiresAt: string | null;
};

function toCoupon(row: typeof coupons.$inferSelect): Coupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type as Coupon["type"],
    value: row.value,
    active: row.active,
    expiresAt: row.expiresAt ?? null,
  };
}

export async function listCoupons(): Promise<Coupon[]> {
  const db = await getDb();
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return rows.map(toCoupon);
}

/** Devuelve el cupón si está activo y no vencido; si no, null. */
export async function lookupCoupon(code: string): Promise<Coupon | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  const db = await getDb();
  const rows = await db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);

  const row = rows[0];
  if (!row || !row.active) return null;
  if (row.expiresAt && new Date(row.expiresAt) <= new Date()) return null;

  return toCoupon(row);
}

export async function createCoupon(input: {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active?: boolean;
  expiresAt?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const code = input.code.trim().toLowerCase();
  if (!code) return { ok: false, error: "El código es obligatorio." };
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return { ok: false, error: "El valor debe ser positivo." };
  }
  if (input.type === "percent" && input.value > 100) {
    return { ok: false, error: "El descuento no puede pasar de 100%." };
  }

  const db = await getDb();
  const existing = await db
    .select({ id: coupons.id })
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);
  if (existing[0]) return { ok: false, error: "Ese código ya existe." };

  const id = `coup_${crypto.randomUUID()}`;
  await db.insert(coupons).values({
    id,
    code,
    type: input.type,
    value: Math.round(input.value),
    active: input.active ?? true,
    expiresAt: input.expiresAt ?? null,
  });

  return { ok: true, id };
}

export async function deleteCoupon(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(coupons).where(eq(coupons.id, id));
}
