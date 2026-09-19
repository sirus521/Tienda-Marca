import { brand, type Currency } from "@/config/brand";

/**
 * Dinero
 * ============================================================================
 * REGLA: todo el dinero se representa en **centavos enteros**, nunca en
 * decimales flotantes.
 *
 * Por qué: `0.1 + 0.2 !== 0.3` en punto flotante. En un carrito con varios
 * artículos esos errores se acumulan y el total puede diferir por un centavo
 * respecto a la suma de las líneas. En una tienda eso es un bug visible y una
 * discusión con el cliente. Con enteros el problema no existe.
 *
 * El formateo a texto ocurre solo en el borde de presentación.
 */

/** Caché de formateadores: crear `Intl.NumberFormat` es costoso, reutilizar es clave. */
const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: Currency): Intl.NumberFormat {
  const key = `${locale}:${currency}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    // Sin ".00" en precios redondos: $549 en vez de $549.00
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

export type FormatMoneyOptions = {
  currency?: Currency;
  locale?: string;
  /** Oculta el símbolo de moneda. Útil cuando el contexto ya lo dice. */
  hideSymbol?: boolean;
};

/** Convierte centavos a texto listo para mostrar. Ej: 54900 -> "$549" */
export function formatMoney(cents: number, options: FormatMoneyOptions = {}): string {
  const {
    currency = brand.commerce.currency,
    locale = brand.commerce.locale,
    hideSymbol = false,
  } = options;

  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const amount = safeCents / 100;

  if (hideSymbol) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return getFormatter(locale, currency).format(amount);
}

/** Convierte un monto decimal a centavos enteros. Ej: 549.5 -> 54950 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convierte centavos a monto decimal. Solo para inputs del admin. */
export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Interpreta lo que un humano escribe en el campo de precio.
 * Acepta "549", "$549", "549.50", "549,50" y "1,299".
 * Devuelve `null` si no es un precio válido — nunca lanza excepción.
 */
export function parsePriceInput(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/[^\d.,-]/g, "")
    .replace(/,(?=\d{3}\b)/g, "") // separador de miles
    .replace(",", "."); // coma decimal

  if (cleaned === "" || cleaned === "-") return null;

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return toCents(parsed);
}

/** Suma segura de centavos. */
export function sumCents(values: readonly number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? Math.round(value) : 0), 0);
}

/**
 * Descuento porcentual a partir del precio comparativo (el "antes").
 * Devuelve `null` cuando no hay descuento real que mostrar.
 */
export function percentOff(priceCents: number, compareAtCents?: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}