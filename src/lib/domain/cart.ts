import { getVariantImage } from "./catalog";
import type { CartLine, Product, ProductVariant } from "./types";

/**
 * Construcción de líneas del carrito
 * ============================================================================
 * Traduce "producto + variante elegida" a la línea que guarda la bolsa.
 *
 * POR QUÉ ES UNA FUNCIÓN APARTE Y NO CÓDIGO DENTRO DEL COMPONENTE
 *  1. ES LA MISMA OPERACIÓN EN TRES LUGARES: la ficha de producto, el botón
 *     "volver a comprar" del historial y, más adelante, el panel de
 *     administración al crear un pedido manual. Tres copias divergen.
 *  2. ES LÓGICA PURA. Se puede probar sin montar React: entra un producto con
 *     variante y sale una línea. Es justo el tipo de código donde un bug de
 *     precio cuesta dinero.
 *
 * El respaldo de imagen importa: si la variante no tiene foto propia, se usa la
 * principal. Sin eso, elegir un color sin fotos dejaría un hueco en la bolsa.
 */
export function buildCartLine(product: Product, variant: ProductVariant): CartLine {
  const image = getVariantImage(product, variant);

  return {
    variantId: variant.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    variantSku: variant.sku,
    optionValues: { ...variant.optionValues },
    unitPriceCents: variant.priceCents,
    quantity: 1,
    imageUrl: image?.url ?? "",
    imageAlt: image?.alt ?? product.name,
    /* El tope se congela al agregar. El servidor lo revalida al crear el
       pedido: aquí solo evita que alguien ponga 500 piezas en la bolsa. */
    maxStock: variant.stock,
  };
}

/** Texto legible de las opciones elegidas. Ej: "Talla L · Negro Hueso". */
export function describeOptions(optionValues: Record<string, string>): string {
  return Object.entries(optionValues)
    .map(([name, value]) => `${name} ${value}`)
    .join(" · ");
}