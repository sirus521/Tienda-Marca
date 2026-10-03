import { eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { orderItems, orders, orderStatusHistory, productVariants, products } from "@/lib/db/schema";
import { createFolio, computeTotals } from "@/lib/domain/order";
import type { CartLine, Order, OrderCustomer, DeliveryMethod } from "@/lib/domain/types";

/**
 * Repositorio de pedidos
 * ============================================================================
 * Escribe pedidos en D1 y, sobre todo, decide si un pedido es válido.
 *
 * LA REGLA QUE DOMINA TODO ESTE ARCHIVO
 * El carrito vive en `localStorage`. Eso significa que el navegador es la
 * fuente de los datos, y quien abra las herramientas de desarrollo puede
 * cambiar el precio a $1, la cantidad a 500 o el id de variante al que quiera.
 * Por eso NADA de lo que viene del carrito se toma como cierto: el precio se
 * vuelve a leer de la base, el stock se comprueba contra la base y la existencia
 * de la variante también.
 *
 * Lo que sí se confía del cliente es su nombre, su teléfono y sus
 * instrucciones. No tienen forma de untrueverse: son datos que solo él tiene.
 *
 * POR QUÉ `batch()` Y NO UNA TRANSACCIÓN
 * D1 no admite transacciones interactivas: no se puede abrir un BEGIN, leer
 * el stock, escribir y cerrarlo. Lo que sí ofrece es `batch()`, que ejecuta el
 * grupo de sentencias dentro de una transacción implícita: o se aplican todas
 * o ninguna.
 *
 * Eso obliga a que la garantía de stock la ponga la base de datos y no el
 * código. Por eso `product_variants` tiene un `CHECK (stock >= 0)`: si dos
 * personas compran la última unidad a la vez, el segundo `UPDATE` intentaría
 * dejar el stock en -1, el CHECK lo rechaza, y `batch()` revierte el pedido
 * entero. Confiar en un `if (stock > 0)` de JavaScript dejaría una ventana
 * entre la lectura y la escritura.
 */

/**
 * Resultado de intentar crear un pedido. Discriminado por `ok`.
 *
 * `productSlugs` va en el caso exitoso porque quien llama necesita saber qué
 * páginas quedaron desactualizadas: este pedido Vació stock, y las fichas de
 * esos productos muestran "quedan N". El repositorio ya tenía el slug a mano
 * —los lee para comprobar que el producto esté publicado—, así que devolverlo
 * cuesta un `Map` y ahorra a la acción una segunda consulta a la base.
 */
export type CreateOrderResult =
  { ok: true; order: Order; productSlugs: string[] } | { ok: false; error: string };

/** Cuántos folios se prueban antes de rendirse. */
const FOLIO_ATTEMPTS = 5;

/** Identifica el CHECK de stock en el mensaje de error de D1. */
const STOCK_CHECK_NAME = "product_variants_stock_nonneg";

/**
 * Crea un pedido.
 *
 * Pasos, en este orden porque cada uno acota al siguiente:
 *  1. Resolver cada línea contra el catálogo. Una variante que no exista o cuyo
 *     producto esté despublicado se descarta.
 *  2. Comprobar stock. Si algo se agotó entre agregar y pagar, se dice qué
 *     producto es y cuántos quedan, en vez de crear un pedido imposible.
 *  3. Calcular totales con los precios de la base, no los del carrito.
 *  4. Escribir cabecera, líneas, historial y descuento de stock en un `batch`.
 */
export async function createOrder(
  lines: readonly CartLine[],
  customer: OrderCustomer,
  deliveryMethod: DeliveryMethod,
): Promise<CreateOrderResult> {
  const db = await getDb();

  /* ---------------------------------------------------------------------
     1. RESOLVER LAS LÍNEAS CONTRA EL CATÁLOGO
     --------------------------------------------------------------------- */
  const requestedIds = lines.map((line) => line.variantId);

  const variantRows = await db
    .select({
      variantId: productVariants.id,
      productId: productVariants.productId,
      sku: productVariants.sku,
      priceCents: productVariants.priceCents,
      stock: productVariants.stock,
      optionValues: productVariants.optionValues,
    })
    .from(productVariants)
    .where(inArray(productVariants.id, requestedIds));

  /* Los productos en una sola consulta, no una por línea. */
  const productIds = [...new Set(variantRows.map((variant) => variant.productId))];
  const productRows =
    productIds.length === 0
      ? []
      : await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            status: products.status,
          })
          .from(products)
          .where(inArray(products.id, productIds));

  const variantsById = new Map(variantRows.map((variant) => [variant.variantId, variant]));
  const productsById = new Map(productRows.map((product) => [product.id, product]));

  /* ---------------------------------------------------------------------
     2. STOCK Y PUBLICACIÓN
     --------------------------------------------------------------------- */
  const resolved: ResolvedLine[] = [];

  for (const line of lines) {
    const variant = variantsById.get(line.variantId);
    if (!variant) continue;

    const product = productsById.get(variant.productId);
    if (!product) continue;

    /* Un producto despublicado no se puede pedir aunque quede la URL guardada
       en el carrito de alguien. */
    if (product.status !== "published") continue;

    if (variant.stock < line.quantity) {
      return {
        ok: false,
        error:
          variant.stock === 0
            ? `Se agotó ${product.name}. Quítalo de la bolsa para continuar.`
            : `Solo quedan ${variant.stock} de ${product.name} y pediste ${line.quantity}.`,
      };
    }

    resolved.push({
      variantId: variant.variantId,
      productId: variant.productId,
      productName: product.name,
      productSlug: product.slug,
      sku: variant.sku,
      optionValues: parseOptionValues(variant.optionValues),
      unitPriceCents: variant.priceCents,
      quantity: line.quantity,
      imageUrl: line.imageUrl,
    });
  }

  if (resolved.length === 0) {
    return { ok: false, error: "Ninguno de los productos de tu bolsa está disponible." };
  }

  /* Si una línea se descartó por estar despublicada pero quedaban otras, avisamos
     en vez de cobrar de más: la persona ve que su pedido cambió. */
  if (resolved.length !== lines.length) {
    return { ok: false, error: "Parte de tu bolsa ya no está disponible. Revísala y continúa." };
  }

  /* ---------------------------------------------------------------------
     3. TOTALES CON LOS PRECIOS DE LA BASE
     --------------------------------------------------------------------- */
  const items = resolved.map((line) => ({
    variantId: line.variantId,
    productId: line.productId,
    productName: line.productName,
    variantSku: line.sku,
    optionValues: line.optionValues,
    unitPriceCents: line.unitPriceCents,
    quantity: line.quantity,
    lineTotalCents: line.unitPriceCents * line.quantity,
    imageUrl: line.imageUrl,
  }));

  /* Los totales salen de `computeTotals`, que es el único sitio donde se decide
     cómo se suma un total. El envío todavía no tiene tarifa calculada —se
     acuerda en el chat—, y por eso el segundo argumento es 0 explícito y no una
     regla escondida aquí. */
  const totals = computeTotals(items);

  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();

  /* ---------------------------------------------------------------------
     4. ESCRITURA
     --------------------------------------------------------------------- */
  for (let attempt = 1; attempt <= FOLIO_ATTEMPTS; attempt += 1) {
    const folio = createFolio();

    try {
      await db.batch([
        db.insert(orders).values({
          id: orderId,
          folio,
          status: "new",
          deliveryMethod,
          paymentMethod: "whatsapp",
          customerFullName: customer.fullName,
          customerPhone: customer.phone,
          customerEmail: customer.email,
          customerPostalCode: customer.postalCode,
          customerCity: customer.city,
          customerState: customer.state,
          customerNotes: customer.notes,
          subtotalCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          discountCents: totals.discountCents,
          totalCents: totals.totalCents,
          currency: "MXN",
          createdAt: now,
          updatedAt: now,
        }),

        db.insert(orderItems).values(
          items.map((item, position) => ({
            id: crypto.randomUUID(),
            orderId,
            variantId: item.variantId,
            productId: item.productId,
            productName: item.productName,
            variantSku: item.variantSku,
            optionValues: JSON.stringify(item.optionValues),
            unitPriceCents: item.unitPriceCents,
            quantity: item.quantity,
            lineTotalCents: item.lineTotalCents,
            imageUrl: item.imageUrl,
            position,
          })),
        ),

        /* La primera entrada del historial deja constancia de que el pedido
           nació, no solo de que cambió de estado después. */
        db.insert(orderStatusHistory).values({
          id: crypto.randomUUID(),
          orderId,
          fromStatus: null,
          toStatus: "new",
          note: null,
          changedBy: "cliente",
          createdAt: now,
        }),

        /* Una sentencia por variante, descontando. El CHECK del esquema es lo
           que impide que el stock quede en negativo si dos pedidos se cruzan. */
        ...items.map((item) =>
          db
            .update(productVariants)
            .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
            .where(eq(productVariants.id, item.variantId)),
        ),
      ]);

      /* Se llega aquí solo si el batch entero se aplicó. */
      const order: Order = {
        id: orderId,
        folio,
        status: "new",
        deliveryMethod,
        items,
        customer,
        totals,
        currency: "MXN",
        internalNotes: null,
        createdAt: now,
        updatedAt: now,
      };

      /* Un pedido puede traer varias tallas del mismo producto, y la ficha es
         una sola: sin esto se revalidaría la misma URL varias veces. */
      const productSlugs = [...new Set(resolved.map((line) => line.productSlug))];

      return { ok: true, order, productSlugs };
    } catch (error) {
      /* Choque de folio: es lo esperado, no un fallo. Se prueba otro. */
      if (isUniqueViolation(error)) continue;

      /* Se agotó entre la lectura y la escritura. El `batch` ya revirtió el
         pedido, así que solo hace falta traducirlo a algo que la persona
         entienda. */
      if (isStockViolation(error)) {
        return {
          ok: false,
          error: "Alguien más se llevó la última pieza mientras confirmabas. Revisa tu bolsa.",
        };
      }

      throw error;
    }
  }

  return {
    ok: false,
    error: "No pudimos asignar un folio de pedido. Inténtalo de nuevo en un momento.",
  };
}

/** Línea ya resuelta contra el catálogo: lo que se cobra es esto, no el carrito. */
type ResolvedLine = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  optionValues: Record<string, string>;
  unitPriceCents: number;
  quantity: number;
  imageUrl: string;
};

/**
 * Traduce el código de error de D1 a un motivo entendible.
 *
 * D1 no expone un código estable para las violaciones de restricción: llega el
 * nombre de la restricción dentro del mensaje. Es la única vía, y se acota a los
 * dos casos que este archivo sabe manejar. Cualquier otro error sube tal cual,
 * para no convertir un fallo real en un mensaje genérico que esconda la causa.
 */
function isUniqueViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message);
}

function isStockViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes(STOCK_CHECK_NAME);
}

/** Deserializa el mapa de opciones de una variante. */
function parseOptionValues(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}
