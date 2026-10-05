"use server";

import { revalidatePath } from "next/cache";

import type { CheckoutState } from "@/app/checkout/state";
import { listProductVariants } from "@/lib/data/catalog-repository";
import { createOrder } from "@/lib/data/order-repository";
import { lookupCoupon } from "@/lib/data/coupon-repository";
import { checkoutSchema, orderWhatsappUrl } from "@/lib/domain/order";
import { getBrandConfig } from "@/lib/config/brand-runtime";
import type { OrderCustomer } from "@/lib/domain/types";

/**
 * Crear pedido
 * ============================================================================
 * Server action del checkout. Es el único punto por el que un pedido entra al
 * sistema, y hace tres cosas en orden:
 *
 *  1. Validar lo que llega.
 *  2. Volver a leer precios y stock de la base. Lo que viene del navegador es
 *     una pista, no una verdad.
 *  3. Devolver el enlace de WhatsApp con el pedido ya escrito.
 *
 * POR QUÉ `createOrder` DEBE SEGIR SIENDO ASÍNCRONO Y CON SU PROPIA VALIDACIÓN
 * Esta función no sabe de D1, solo orquesta. La comprobación de stock y de
 * precio vive en `order-repository`, que es donde está la base de datos. Si
 * ambos hicieran lo mismo habría dos lugares donde el stock se valida, y el
 * día que cambien las reglas uno se quedaría atrás.
 *
 * REGLA DE ESTE ARCHIVO
 * Al llevar `"use server"`, lo único que puede exportar es la acción. El tipo
 * `CheckoutState` y el estado inicial viven en `./state`; exportar aquí una
 * constante rompe el checkout con un 500 en tiempo de ejecución.
 */

/**
 * Lo que el formulario envía.
 *
 * Las líneas llegan solo con `variantId` y `quantity`. El nombre, el precio y
 * la foto NO viajan desde el navegador: se vuelven a leer de la base. Enviar
 * datos que el servidor ya puede consultar solo abre la puerta a que los
 * falseen.
 */
export type CheckoutFormLines = {
  variantId: string;
  quantity: number;
}[];

export async function submitOrderAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  /* ---------------------------------------------------------------------
     1. LEER Y VALIDAR EL FORMULARIO
     --------------------------------------------------------------------- */
  const parsed = checkoutSchema.safeParse({
    deliveryMethod: formData.get("deliveryMethod"),
    customer: {
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      postalCode: formData.get("postalCode"),
      city: formData.get("city"),
      state: formData.get("state"),
      notes: formData.get("notes"),
    },
    lines: parseLines(formData.get("lines")),
  });

  if (!parsed.success) {
    /* Se aplanan los errores a un mapa por campo. Zod las anida, y el
       formulario solo sabe pintar mensajes junto a un input. */
    const fieldErrors: Record<string, string> = {};

    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }

    return { status: "error", message: "Revisa los datos marcados.", fieldErrors };
  }

  const { deliveryMethod, customer, lines } = parsed.data;

  /* Cupón opcional: se valida en el servidor y el descuento se calcula con los
     precios reales (la fuente de verdad), no los del navegador. */
  const couponCodeRaw = formData.get("couponCode");
  const coupon =
    typeof couponCodeRaw === "string" && couponCodeRaw.trim() !== ""
      ? await lookupCoupon(couponCodeRaw)
      : null;

  if (typeof couponCodeRaw === "string" && couponCodeRaw.trim() !== "" && !coupon) {
    return {
      status: "error",
      message: "Ese cupón no es válido o expiró. Revísalo e intenta de nuevo.",
    };
  }

  /* ---------------------------------------------------------------------
     2. RECUPERAR LOS ARTÍCULOS DESDE LA BASE
     --------------------------------------------------------------------- */
  /* Se necesitan nombre, precio e imagen para construir las líneas que
     `createOrder` acaba revalidando. Se leen aquí y se le pasan como
     `CartLine`: la información de cliente y la de producto viajan separadas. */
  const linesWithDetails = await hydrateLines(lines);

  if (linesWithDetails.length === 0) {
    return { status: "error", message: "Tu bolsa está vacía o ya no está disponible." };
  }

  /* `hydrateLines` descarta lo que no encuentra, así que un `variantId`
     manipulado desaparecería en silencio y el cliente vería un pedido más
     barato del que cree haber hecho. Se compara el conteo: si no calza, algo no
     existe y se dice, en vez de mandar a WhatsApp un pedido incompleto. */
  if (linesWithDetails.length !== lines.length) {
    return {
      status: "error",
      message: "Parte de tu bolsa ya no está disponible. Revísala y vuelve a intentarlo.",
    };
  }

  const orderCustomer: OrderCustomer = {
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    postalCode: customer.postalCode,
    city: customer.city,
    state: customer.state,
    notes: customer.notes,
  };

  const subtotalCents = linesWithDetails.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const discountCents = coupon
    ? coupon.type === "percent"
      ? Math.round((subtotalCents * coupon.value) / 100)
      : coupon.value
    : 0;

  /* ---------------------------------------------------------------------
     3. ESCRIBIR
     --------------------------------------------------------------------- */
  const result = await createOrder(linesWithDetails, orderCustomer, deliveryMethod, {
    discountCents,
  });

  if (!result.ok) {
    /* `createOrder` ya devuelve un mensaje pensado para la persona que compra:
       dice qué producto y cuántos quedan. */
    return { status: "error", message: result.error };
  }

  /* Este pedido acaba vaciar stock, y el stock se ve en tres sitios. La
     portada y la tienda lo muestran en la rejilla; cada ficha lo muestra en el
     selector de talla con "quedan N piezas". Sin esto, un producto agotado
     seguiría anunciando stock hasta que vencieran sus 5 minutos de ISR — y
     durante esos 5 minutos se puede volver a intentar comprar lo que ya no
     hay, que es justo el fallo que el CHECK de stock evita en la base pero no
     en la pantalla.

     Se revalidan solo las fichas de los productos de ESTE pedido y no todas:
     con un catálogo chico da igual, y con uno grande cada venta tiraría abajo
     el HTML de páginas que no cambiaron. */
  revalidatePath("/");
  revalidatePath("/tienda");

  for (const slug of result.productSlugs) {
    revalidatePath(`/producto/${slug}`);
  }

  return {
    status: "success",
    folio: result.order.folio,
    whatsappUrl: orderWhatsappUrl(result.order, await getBrandConfig()),
    message: "Pedido registrado.",
  };
}

/* ============================================================================
   AYUDANTES
   ============================================================================ */

/**
 * Lee las líneas del formulario.
 *
 * Viajan como un único campo JSON en vez de como inputs con nombres dinámicos
 * (`line-0-variantId`, `line-1-quantity`...). Con el JSON hay un solo campo que
 * validar, y un `FormData` con cuarenta entradas derivadas del nombre es la
 * forma más fácil de equivocarse al armas la estructura.
 */
function parseLines(raw: FormDataEntryValue | null): CheckoutFormLines {
  if (typeof raw !== "string" || raw === "") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckoutFormLines) : [];
  } catch {
    return [];
  }
}

/**
 * Completa las líneas con los datos del catálogo.
 *
 * Es una lectura, no una decisión: si algo no existe, la línea se descarta y
 * quien llama lo detecta comparando el conteo, porque no se filtran líneas
 * silenciosamente. Un pedido que sale con un artículo menos del que alguien
 * puso en su bolsa es peor que un error: cobra de menos y genera una
 * conversación incómoda por WhatsApp.
 */
async function hydrateLines(
  lines: ReadonlyArray<CheckoutFormLines[number]>,
): Promise<HydratedLine[]> {
  const found = await listProductVariants(lines.map((line) => line.variantId));
  const byId = new Map(found.map((variant) => [variant.id, variant]));

  return lines.flatMap((line) => {
    const variant = byId.get(line.variantId);
    if (!variant) return [];

    return [
      {
        variantId: variant.id,
        productId: variant.productId,
        productSlug: variant.productSlug,
        productName: variant.productName,
        variantSku: variant.sku,
        optionValues: variant.optionValues,
        /* El precio que se pinta aquí es informativo. `createOrder` lo vuelve a
           leer y es ese el que cobra. */
        unitPriceCents: variant.priceCents,
        quantity: line.quantity,
        imageUrl: variant.imageUrl,
        imageAlt: variant.imageAlt,
        maxStock: variant.stock,
      },
    ];
  });
}

/** Una línea de `CartLine` reconstruida desde la base. */
type HydratedLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantSku: string;
  optionValues: Record<string, string>;
  unitPriceCents: number;
  quantity: number;
  imageUrl: string;
  imageAlt: string;
  maxStock: number;
};
