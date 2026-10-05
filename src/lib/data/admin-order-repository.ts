import { and, desc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { orderItems, orderStatusHistory, orders, productVariants, products } from "@/lib/db/schema";
import { parseOptionValues } from "./order-repository";
import type {
  DeliveryMethod,
  Order,
  OrderCustomer,
  OrderStatus,
  OrderTotals,
} from "@/lib/domain/types";

/**
 * Lectura y estado de pedidos para el panel
 * ============================================================================
 * `order-repository` escribe pedidos del cliente. Este archivo los lee y los
 * cambia de estado desde `/admin`, porque un panel que intenta hacer ambas
 * cosas acaba con reglas de negocio duplicadas en `actions.ts`.
 *
 * LO QUE NO HACE
 * No decide qué estados existen ni qué totales se cobra. `orders` ya guarda el
 * desenlace del checkout; aquí solo se traduce y se audita un cambio.
 */

export type OrderSummary = {
  id: string;
  folio: string;
  status: OrderStatus;
  customerFullName: string;
  customerPhone: string;
  totalCents: number;
  currency: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lista pedidos, del más nuevo al más viejo.
 *
 * `status` admite `all` porque la vista principal del panel es "todos"; el
 * filtro por estado es la segunda forma de uso, no la principal.
 */
export async function listOrders(
  input: {
    status?: OrderStatus | "all";
    limit?: number;
    offset?: number;
    q?: string;
  } = {},
): Promise<OrderSummary[]> {
  const db = await getDb();
  const limit = input.limit ?? 50;
  const offset = typeof input.offset === "number" && input.offset >= 0 ? input.offset : 0;

  const conditions: SQL[] = [];

  if (input.status && input.status !== "all") {
    conditions.push(eq(orders.status, input.status));
  }

  if (input.q && input.q.trim() !== "") {
    const likeStr = `%${input.q.trim()}%`;
    conditions.push(
      or(
        like(orders.folio, likeStr),
        like(orders.customerFullName, likeStr),
        like(orders.customerPhone, likeStr),
      )!,
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: orders.id,
      folio: orders.folio,
      status: orders.status,
      customerFullName: orders.customerFullName,
      customerPhone: orders.customerPhone,
      totalCents: orders.totalCents,
      currency: orders.currency,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
      itemCount: sql<number>`sum(${orderItems.quantity})`,
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(whereClause)
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    id: row.id,
    folio: row.folio,
    status: row.status as OrderStatus,
    customerFullName: row.customerFullName,
    customerPhone: row.customerPhone,
    totalCents: row.totalCents,
    currency: row.currency,
    itemCount: Number(row.itemCount ?? 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** Trae un pedido completo, con artículos e historial ya listos para pintar. */
export async function getOrderById(id: string): Promise<Order | null> {
  const db = await getDb();

  const orderRows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const orderRow = orderRows[0];
  if (!orderRow) return null;

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(orderItems.position);

  const customer: OrderCustomer = {
    fullName: orderRow.customerFullName,
    phone: orderRow.customerPhone,
    email: orderRow.customerEmail,
    postalCode: orderRow.customerPostalCode,
    city: orderRow.customerCity,
    state: orderRow.customerState,
    notes: orderRow.customerNotes,
  };

  const totals: OrderTotals = {
    subtotalCents: orderRow.subtotalCents,
    shippingCents: orderRow.shippingCents,
    discountCents: orderRow.discountCents,
    totalCents: orderRow.totalCents,
  };

  return {
    id: orderRow.id,
    folio: orderRow.folio,
    status: orderRow.status as OrderStatus,
    deliveryMethod: orderRow.deliveryMethod as DeliveryMethod,
    paymentMethod: orderRow.paymentMethod as Order["paymentMethod"],
    items: itemRows.map((item) => ({
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      variantSku: item.variantSku,
      optionValues: parseOptionValues(item.optionValues),
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      imageUrl: item.imageUrl,
    })),
    customer,
    totals,
    currency: orderRow.currency as Order["currency"],
    internalNotes: orderRow.internalNotes,
    createdAt: orderRow.createdAt,
    updatedAt: orderRow.updatedAt,
  };
}

/** Obtiene historial de estados de un pedido, del más antiguo al más nuevo. */
export async function getOrderStatusHistory(orderId: string) {
  const db = await getDb();
  return db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, orderId))
    .orderBy(orderStatusHistory.createdAt);
}

/**
 * Cambia el estado de un pedido.
 *
 * Reglas:
 *  - No se puede "reactivar" un pedido cancelado automáticamente: si el stock
 *    ya se devolvió, volverlo atrás necesita una nueva comprobación y una
 *    decisión explícita del negocio.
 *  - Un pedido enviado o entregado no se cancela desde aquí: eso requiere
 *    devolución de mercancía y un ajuste de inventario calculado a mano.
 *  - Al cancelar, el stock se devuelve. La venta ya descontó esas piezas;
 *    cancelarla sin devolverlas es un error contable.
 */
export async function updateOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  changedBy: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  const order = orderRows[0];

  if (!order) {
    return { ok: false, error: "El pedido no existe." };
  }

  if (order.status === input.status) {
    return { ok: false, error: `El pedido ya está en estado "${order.status}".` };
  }

  if (order.status === "cancelled") {
    return { ok: false, error: "Un pedido cancelado no puede cambiar de estado." };
  }

  /* Solo `new` y `confirmed` pueden cancelarse y devolver stock. Los demás
     casos —shipped, delivered— pasan por logística y no salen del panel. */
  const restorableCancellation =
    input.status === "cancelled" && (order.status === "new" || order.status === "confirmed");

  if (input.status === "cancelled" && !restorableCancellation) {
    return {
      ok: false,
      error: "Solo se puede cancelar desde 'new' o 'confirmed'. El resto entra por logística.",
    };
  }

  const now = new Date().toISOString();

  if (restorableCancellation) {
    const itemRows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, input.orderId));

    /* Devolver stock y marcar el pedido cancelado van juntos. Si una falla, la
       otra se revierte: no puede haber un pedido cancelado con stock devuelto
       a medias. */
    await db.batch([
      db
        .update(orders)
        .set({ status: input.status, updatedAt: now })
        .where(eq(orders.id, input.orderId)),
      db.insert(orderStatusHistory).values({
        id: crypto.randomUUID(),
        orderId: input.orderId,
        fromStatus: order.status,
        toStatus: input.status,
        note: input.note ?? null,
        changedBy: input.changedBy,
        createdAt: now,
      }),
      ...itemRows.map((item) =>
        db
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
          .where(eq(productVariants.id, item.variantId)),
      ),
    ]);

    return { ok: true };
  }

  await db.batch([
    db
      .update(orders)
      .set({ status: input.status, updatedAt: now })
      .where(eq(orders.id, input.orderId)),
    db.insert(orderStatusHistory).values({
      id: crypto.randomUUID(),
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: input.status,
      note: input.note ?? null,
      changedBy: input.changedBy,
      createdAt: now,
    }),
  ]);

  return { ok: true };
}

export type OrderStats = {
  total: number;
  new: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export async function getOrderStats(): Promise<OrderStats> {
  const db = await getDb();
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)` })
    .from(orders)
    .groupBy(orders.status);

  const count = Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));

  return {
    total: rows.reduce((sum, row) => sum + Number(row.count), 0),
    new: count.new ?? 0,
    confirmed: count.confirmed ?? 0,
    shipped: count.shipped ?? 0,
    delivered: count.delivered ?? 0,
    cancelled: count.cancelled ?? 0,
  };
}

export type AdminCustomer = {
  phone: string;
  fullName: string;
  orderCount: number;
  totalCents: number;
  lastOrderAt: string;
};

/** Clientes (derivados de `orders`, que desnormaliza los datos de compra). */
export async function listCustomers(): Promise<AdminCustomer[]> {
  const db = await getDb();

  const rows = await db
    .select({
      phone: orders.customerPhone,
      fullName: orders.customerFullName,
      orderCount: sql<number>`count(*)`,
      totalCents: sql<number>`sum(${orders.totalCents})`,
      lastOrderAt: sql<string>`max(${orders.createdAt})`,
    })
    .from(orders)
    .groupBy(orders.customerPhone, orders.customerFullName)
    .orderBy(desc(sql`max(${orders.createdAt})`))
    .limit(200);

  return rows.map((row) => ({
    phone: row.phone,
    fullName: row.fullName,
    orderCount: Number(row.orderCount),
    totalCents: Number(row.totalCents ?? 0),
    lastOrderAt: row.lastOrderAt,
  }));
}

export type RevenueStats = {
  totalRevenueCents: number;
  deliveredCount: number;
  averageTicketCents: number;
  /** Ingresos (centavos) por día, ordenados del más viejo al más nuevo. */
  byDay: { date: string; cents: number }[];
};

export async function getRevenueStats(days = 7): Promise<RevenueStats> {
  const db = await getDb();

  const rows = await db
    .select({ totalCents: orders.totalCents, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.status, "delivered"));

  const totalRevenueCents = rows.reduce((sum, row) => sum + (row.totalCents ?? 0), 0);
  const deliveredCount = rows.length;
  const averageTicketCents =
    deliveredCount > 0 ? Math.round(totalRevenueCents / deliveredCount) : 0;

  const byDay: { date: string; cents: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now - i * 86_400_000).toISOString().slice(0, 10);
    byDay.push({ date, cents: 0 });
  }
  for (const row of rows) {
    const date = row.createdAt.slice(0, 10);
    const bucket = byDay.find((entry) => entry.date === date);
    if (bucket) bucket.cents += row.totalCents ?? 0;
  }

  return { totalRevenueCents, deliveredCount, averageTicketCents, byDay };
}

export async function deleteOrder(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = rows[0];
  if (!order) return { ok: false, error: "El pedido no existe." };

  /* Los pedidos nuevos/confirmados todavía no han salido de almacén: al
     eliminarlos hay que devolver el stock que se descontó al crear. Los
     enviados/entregados/cancelados ya gestionaron inventario en otro paso. */
  const shouldRestoreStock = order.status === "new" || order.status === "confirmed";
  const itemRows = shouldRestoreStock
    ? await db.select().from(orderItems).where(eq(orderItems.orderId, orderId))
    : [];

  await db.batch([
    db.delete(orders).where(eq(orders.id, orderId)),
    ...itemRows.map((item) =>
      db
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${item.quantity}` })
        .where(eq(productVariants.id, item.variantId)),
    ),
  ]);

  return { ok: true };
}

/** Obtiene los slugs de productos tocados por un pedido, para revalidar. */
export async function getProductSlugsForOrder(orderId: string): Promise<string[]> {
  const db = await getDb();
  const itemRows = await db
    .select({ productId: orderItems.productId })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  const productIds = [...new Set(itemRows.map((row) => row.productId))];

  if (productIds.length === 0) return [];

  const productRows = await db
    .select({ slug: products.slug })
    .from(products)
    .where(inArray(products.id, productIds));

  return [...new Set(productRows.map((row) => row.slug))];
}
