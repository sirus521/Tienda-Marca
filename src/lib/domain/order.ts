import { z } from "zod";

import { brand } from "@/config/brand";
import { describeOptions } from "@/lib/domain/cart";
import { formatMoney, sumCents } from "@/lib/domain/money";
import type { Order, OrderTotals } from "@/lib/domain/types";

/**
 * Pedidos
 * ============================================================================
 * Lógica pura del pedido: folio, totales, validación de los datos que entra la
 * persona y el mensaje que se manda por WhatsApp.
 *
 * Por qué aquí y no dentro del componente o de la server action: estas reglas
 * se necesitan en dos lados —el navegador para dar feedback inmediato y el
 * servidor para no confiar en nada de lo que llega. Si viviran en la acción, el
 * formulario no podría validar sin ida y vuelta. Al vivir en un módulo sin
 * dependencias de React ni de Cloudflare, ambos los usan igual.
 */

/* ============================================================================
   FOLIO
   ============================================================================
   Formato `AC-7F3K2`: el prefijo de marca y cinco caracteres. Sale legible en
   pantalla y se puede dictar por teléfono sin ambigüedad.

   Se usa el alfabeto de Crockford: sin I, L, O ni U. Motivo práctico —"I" y "1"
   son indistinguibles en una fuente monoespaciada pequeña, y un folio se
   transcribe de viva voz. Con las 32 letras restantes, 5 caracteres dan
   33 millones de combinaciones.
   ============================================================================ */
const FOLIO_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const FOLIO_LENGTH = 5;

/**
 * Genera un folio.
 *
 * No consulta la base, así que no garantiza que sea único por sí solo. Quien
 * lo inserta es responsable del conflicto: `orders.folio` tiene índice único y
 * `order-repository` reintenta con otro folio si choca. Prefiero un reintento
 * puntual a un `SELECT` de comprobación en cada pedido.
 */
export function createFolio(): string {
  const bytes = new Uint8Array(FOLIO_LENGTH);
  crypto.getRandomValues(bytes);

  let suffix = "";
  for (const byte of bytes) {
    /* El módulo sesga los bytes, pero sobre 33 millones de combinaciones de
       cinco caracteres el sesgo es irrelevante y evita un rechazo de sesgo en
       revisión de seguridad. */
    suffix += FOLIO_ALPHABET[byte % FOLIO_ALPHABET.length];
  }

  return `${brand.commerce.orderPrefix}-${suffix}`;
}

/* ============================================================================
   TOTALES
   ============================================================================ */

/**
 * Una línea tal y como la necesita el cálculo de totales.
 *
 * Deliberadamente más estrecha que `CartLine`: el total sale del precio y la
 * cantidad, y nada más. Exigir la línea completa obligaría a `order-repository`
 * a fabricar un `CartLine` —con nombre, SKU y foto— solo para multiplicar dos
 * números, y a duplicar la regla de totales si no lo hiciera.
 */
export type PricedLine = {
  unitPriceCents: number;
  quantity: number;
};

/**
 * Calcula los totales del pedido.
 *
 * Es el ÚNICO sitio donde se decide cómo se suma un total. `order-repository`
 * lo llama en vez de repetir la cuenta: dos lugares con la misma regla son dos
 * lugares que un día se desincronizan, y el que se queda atrás falla en el
 * total que se cobra.
 *
 * `shippingCents` se recibe como parámetro y no se deduce aquí a propósito:
 * todavía no hay tarifas de envío definidas, así que quien construye el pedido
 * decide cuánto aplicar (hoy, cero y el envío se acuerda por WhatsApp). Cuando
 * existan las tarifas, este mismo punto de entrada las recibe.
 */
export function computeTotals(
  lines: readonly PricedLine[],
  shippingCents = 0,
  discountCents = 0,
): OrderTotals {
  const subtotalCents = sumCents(lines.map((line) => line.unitPriceCents * line.quantity));
  const safeShipping = Number.isFinite(shippingCents) ? Math.max(0, Math.round(shippingCents)) : 0;
  const safeDiscount =
    Number.isFinite(discountCents) && discountCents > 0
      ? Math.max(0, Math.round(discountCents))
      : 0;
  const appliedDiscount = Math.min(safeDiscount, subtotalCents);

  return {
    subtotalCents,
    shippingCents: safeShipping,
    discountCents: appliedDiscount,
    totalCents: subtotalCents - appliedDiscount + safeShipping,
  };
}

/* ============================================================================
   VALIDACIÓN DE LOS DATOS DEL CLIENTE
   ============================================================================
   El teléfono sigue la misma regla que la lista de avisos (`notice-list.tsx`):
   10 dígitos o 12 empezando por 52, ignorando espacios, guiones y paréntesis,
   porque así lo escribe la gente.

   El correo es opcional: quien compra para entrega en Monterrey a veces solo
   deja teléfono, y exigirlo baja la conversión sin evitar fraude alguno aquí.
   ============================================================================ */
export const customerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Escribe tu nombre completo.")
    .max(120, "El nombre es demasiado largo."),

  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^\d]/g, ""))
    .refine(
      (digits) => digits.length === 10 || (digits.length === 12 && digits.startsWith("52")),
      "Escribe tu teléfono a 10 dígitos.",
    ),

  email: z
    .string()
    .trim()
    .max(160, "El correo es demasiado largo.")
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Revisa el correo.",
    )
    .transform((value) => (value === "" ? null : value)),

  postalCode: z.string().trim().max(12, "El código postal es demasiado largo.").default(""),

  city: z.string().trim().max(120, "La ciudad es demasiado larga.").default(""),

  state: z.string().trim().max(120, "El estado es demasiado largo.").default(""),

  notes: z
    .string()
    .trim()
    .max(500, "Acorta las instrucciones, máximo 500 caracteres.")
    .default("")
    .transform((value) => (value === "" ? null : value)),
});

export const deliverySchema = z.object({
  method: z.enum(["pickup", "local", "national"], {
    message: "Elige cómo quieres recibirlo.",
  }),
});

/** Los tres campos del carrito: id de variante, cantidad y… nada más. */
export const cartLineSchema = z.object({
  variantId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
});

/** Lo que el formulario envía. El resto lo pone el servidor. */
export const checkoutSchema = z.object({
  deliveryMethod: deliverySchema.shape.method,
  customer: customerSchema,
  lines: z
    .array(cartLineSchema)
    .min(1, "Tu bolsa está vacía.")
    /* La bolsa nunca tiene dos renglones de la misma variante: el store
       fusiona por `variantId` al agregar. Pero el navegador no es de fiar y
       este campo es solo un `JSON.parse`. Si la misma variante llega dos
       veces, el pedido tendría dos renglones del mismo artículo y el descuento
       de stock ocurriría dos veces, así que el inventario dejaría de cuadrar
       con el total. Se rechaza en la puerta en vez de normalizar a mano. */
    .refine(
      (lines) => new Set(lines.map((line) => line.variantId)).size === lines.length,
      "Hay artículos repetidos en tu bolsa. Revísala y continúa.",
    ),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/* ============================================================================
   MENSAJE DE WHATSAPP
   ============================================================================
   Este texto es el pedido real: es lo que el cliente envía y lo que el dueño
   lee para saber qué vender. Si algo está mal, se pierde la venta, así que va
   en un solo sitio y con todos los datos.

   Formato deliberadamente plano —líneas cortas, separadores `─`, sin
   Markdown—: se lee igual en el chat de WhatsApp que en el bloque de notas del
   teléfono, y `wa.me` no interpreta nada.
   ============================================================================ */
export function buildWhatsappMessage(
  order: Order,
  config: { contact: { whatsapp: string; whatsappGreeting: string } } = brand,
): string {
  const lines: string[] = [];

  lines.push(config.contact.whatsappGreeting);
  lines.push("");
  lines.push(`Pedido ${order.folio}`);
  lines.push("─".repeat(28));

  for (const item of order.items) {
    lines.push(`${item.quantity} × ${item.productName}`);

    const options = describeOptions(item.optionValues);
    if (options) lines.push(`   ${options}`);

    lines.push(`   ${item.variantSku} — ${formatMoney(item.lineTotalCents)}`);
  }

  lines.push("─".repeat(28));
  lines.push(`Subtotal: ${formatMoney(order.totals.subtotalCents)}`);
  if (order.totals.discountCents > 0) {
    lines.push(`Descuento: -${formatMoney(order.totals.discountCents)}`);
  }

  /* El envío todavía no tiene tarifa. Decirlo es mejor que omitirlo: si la
     línea no aparece, el total se lee como el costo final de la prenda. */
  lines.push("Envío: se confirma aquí en el chat");
  lines.push(`Total: ${formatMoney(order.totals.totalCents)}`);

  lines.push("");
  lines.push(`Entrega: ${DELIVERY_LABELS[order.deliveryMethod]}`);

  const { customer } = order;
  lines.push(`${customer.fullName}`);
  lines.push(`Tel: ${customer.phone}`);

  if (customer.email) lines.push(`Correo: ${customer.email}`);

  if (order.deliveryMethod !== "pickup") {
    lines.push([customer.postalCode, customer.city, customer.state].filter(Boolean).join(", "));
  }

  if (customer.notes) {
    lines.push("");
    lines.push(`Notas: ${customer.notes}`);
  }

  return lines.filter((line) => line !== undefined).join("\n");
}

/** Etiquetas legibles de cada método de entrega. */
export const DELIVERY_LABELS = {
  pickup: "Recojo en punto",
  local: "Entrega local",
  national: "Envío nacional",
} as const;

/**
 * Enlace de WhatsApp con el pedido escrito.
 *
 * `encodeURIComponent` es obligatorio: el mensaje lleva `\n`, `─` y espacios, y
 * sin codificar rompería la URL. Un pedido de muestra ya lo confirma: el
 * nombre del producto contiene `—`.
 */
export function orderWhatsappUrl(
  order: Order,
  config: { contact: { whatsapp: string; whatsappGreeting: string } } = brand,
): string {
  return `https://wa.me/${config.contact.whatsapp}?text=${encodeURIComponent(
    buildWhatsappMessage(order, config),
  )}`;
}
