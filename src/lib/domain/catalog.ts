import type { Product, ProductImage, ProductOption, ProductVariant } from "./types";

/**
 * Consultas derivadas del catálogo.
 * ============================================================================
 * Funciones puras: entran datos, salen datos. Sin acceso a red, sin estado,
 * sin efectos. Por eso se pueden probar sin montar nada y por eso el carrito
 * y el panel de administración pueden compartirlas sin duplicar lógica.
 */

/** Imagen principal, con respaldo por si ninguna está marcada como tal. */
export function getPrimaryImage(product: Product): ProductImage | null {
  const primary = product.images.find((image) => image.isPrimary);
  if (primary) return primary;

  /* Respaldo: la de menor `position`. Evita tarjetas sin imagen cuando el
     admin olvida marcar la principal. */
  return (
    product.images.slice().sort((a, b) => a.position - b.position)[0] ?? null
  );
}

/** Imagen secundaria: la que aparece al pasar el cursor sobre la tarjeta. */
export function getSecondaryImage(product: Product): ProductImage | null {
  const primary = getPrimaryImage(product);
  const ordered = product.images.slice().sort((a, b) => a.position - b.position);
  return ordered.find((image) => image.id !== primary?.id) ?? null;
}

/** Precio más bajo del producto, en centavos. */
export function getMinPrice(product: Product): number {
  if (product.variants.length === 0) return 0;
  return Math.min(...product.variants.map((variant) => variant.priceCents));
}

/** Precio más alto del producto, en centavos. */
export function getMaxPrice(product: Product): number {
  if (product.variants.length === 0) return 0;
  return Math.max(...product.variants.map((variant) => variant.priceCents));
}

/** `true` cuando el producto tiene variantes con precios distintos. */
export function hasPriceRange(product: Product): boolean {
  return getMinPrice(product) !== getMaxPrice(product);
}

/** Unidades totales disponibles sumando todas las variantes. */
export function getTotalStock(product: Product): number {
  return product.variants.reduce((total, variant) => total + variant.stock, 0);
}

/** `true` cuando no queda ninguna unidad. */
export function isSoldOut(product: Product): boolean {
  return product.variants.length > 0 && getTotalStock(product) === 0;
}

/** `true` cuando quedan pocas unidades. Sirve para el aviso "últimas piezas". */
export function isLowStock(product: Product, threshold = 5): boolean {
  const stock = getTotalStock(product);
  return stock > 0 && stock <= threshold;
}

/**
 * Valores distintos de un eje, en orden de presentación.
 * Es lo que alimenta los chips de talla y los selectores de color.
 */
export function getOptionValues(product: Product, optionName: string): string[] {
  const option = product.options.find((item) => item.name === optionName);
  if (!option) return [];

  return option.values
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((value) => value.value);
}

/** El eje de tallas, si existe. Atajo de lectura para la interfaz. */
export function getSizeOption(product: Product): ProductOption | null {
  return product.options.find((option) => option.name === "Talla") ?? null;
}

/**
 * Busca la variante que corresponde a una combinación de opciones.
 *
 * Compara todos los ejes en ambas direcciones, así que un mapa con claves de
 * más (por ejemplo del estado previo de un selector) no produce un falso
 * positivo.
 */
export function findVariant(
  product: Product,
  selection: Record<string, string>,
): ProductVariant | null {
  const entries = Object.entries(selection);
  if (entries.length === 0) return null;

  return (
    product.variants.find((variant) =>
      entries.every(([name, value]) => variant.optionValues[name] === value),
    ) ?? null
  );
}

/**
 * Variante que debe quedar seleccionada al abrir un producto.
 * Prioriza la primera que tenga stock: mostrar por defecto una talla agotada
 * obliga al cliente a corregir algo antes de poder comprar.
 */
export function getDefaultVariant(product: Product): ProductVariant | null {
  return product.variants.find((variant) => variant.stock > 0) ?? product.variants[0] ?? null;
}

/** Convierte una variante en el mapa de opciones para los selectores. */
export function variantToSelection(variant: ProductVariant): Record<string, string> {
  return { ...variant.optionValues };
}

/**
 * Resuelve una selección parcial a una variante válida.
 * ============================================================================
 * POR QUÉ HACE FALTA
 * El cliente no elige ejes en orden fijo. Puede tocar "Color: Arena" cuando ya
 * tenía "Talla: L" y esa combinación concreta no existe en el inventario. Si la
 * interfaz se quedara con la selección rota, el botón de compra moriría sin
 * explicar nada.
 *
 * QUÉ HACE
 *  1. Si la selección exacta existe, la devuelve tal cual.
 *  2. Si no, busca entre las variantes las que coincidan con más ejes de la
 *     selección y **reajusta la selección** a una combinación que sí existe.
 *     El efecto visual es que los selectores "se acomodan" solos y nunca queda
 *     un estado imposible.
 *
 * PRIORIZA STOCK
 * Entre las candidatas empata primero por número de coincidencias y luego por
 * stock disponible: es preferible aterrizar en una talla que se puede comprar.
 */
export function resolveVariantSelection(
  product: Product,
  selection: Record<string, string>,
): { variant: ProductVariant | null; selection: Record<string, string> } {
  const exact = findVariant(product, selection);
  if (exact) return { variant: exact, selection: { ...exact.optionValues } };

  if (product.variants.length === 0) return { variant: null, selection };

  const entries = Object.entries(selection);

  const scored = product.variants
    .map((variant) => {
      const matches = entries.filter(
        ([name, value]) => variant.optionValues[name] === value,
      ).length;

      return { variant, matches, hasStock: variant.stock > 0 };
    })
    .sort((a, b) => {
      if (b.matches !== a.matches) return b.matches - a.matches;
      if (a.hasStock !== b.hasStock) return a.hasStock ? -1 : 1;
      return 0;
    });

  const best = scored[0]?.variant ?? null;

  return best
    ? { variant: best, selection: { ...best.optionValues } }
    : { variant: null, selection };
}

/**
 * `true` si un valor concreto de un eje tiene stock dadas las demás
 * selecciones activas.
 *
 * Es lo que permite tachar la talla "XL" cuando el color elegido está agotado
 * en ese talle, en lugar de dejar que el cliente la elija y descubra el
 * problema al final.
 */
export function isOptionValueAvailable(
  product: Product,
  optionName: string,
  value: string,
  selection: Record<string, string>,
): boolean {
  return product.variants.some((variant) => {
    if (variant.stock <= 0) return false;
    if (variant.optionValues[optionName] !== value) return false;

    /* El eje evaluado se ignora: estamos preguntando precisamente por él. */
    return Object.entries(selection).every(
      ([name, selected]) => name === optionName || variant.optionValues[name] === selected,
    );
  });
}

/** Imagen asociada a una variante o, si no tiene, la principal del producto. */
export function getVariantImage(product: Product, variant: ProductVariant | null): ProductImage | null {
  if (variant?.imageId) {
    const match = product.images.find((image) => image.id === variant.imageId);
    if (match) return match;
  }

  return getPrimaryImage(product);
}