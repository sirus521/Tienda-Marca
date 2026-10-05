import { brand } from "@/config/brand";
import { readSettingValue } from "@/lib/data/admin-repository";

/**
 * Marca en caliente
 * ============================================================================
 * `src/config/brand.ts` sigue siendo la fuente de verdad por defecto (que vive
 * en código), pero algunos valores —WhatsApp, saludo, correo, Instagram,
 * ubicación, envío gratis y prefijo de folio— se pueden sobreescribir desde
 * el panel (`/admin/ajustes → Marca`), y se guardan en la tabla `settings`
 * con la clave `brand`. El resultado es un objeto del mismo contrato que
 * `brand`, por lo que se puede usar como reemplazo en componentes y acciones.
 */
export type BrandConfig = {
  identity: typeof brand.identity;
  contact: {
    whatsapp: string;
    whatsappGreeting: string;
    email: string;
    instagram: string;
    location: string;
  };
  commerce: {
    currency: string;
    locale: string;
    checkoutMode: string;
    freeShippingThresholdCents: number;
    orderPrefix: string;
  };
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return undefined;
}

function asNonNegativeNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.trunc(value);
  return undefined;
}

export async function getBrandConfig(): Promise<BrandConfig> {
  let overrides: Record<string, unknown> = {};
  try {
    overrides = (await readSettingValue("brand")) ?? {};
  } catch {
    overrides = {};
  }

  return {
    identity: brand.identity,
    contact: {
      whatsapp: asNonEmptyString(overrides.whatsapp) ?? brand.contact.whatsapp,
      whatsappGreeting:
        asNonEmptyString(overrides.whatsappGreeting) ?? brand.contact.whatsappGreeting,
      email: asNonEmptyString(overrides.email) ?? brand.contact.email,
      instagram: asNonEmptyString(overrides.instagram) ?? brand.contact.instagram,
      location: asNonEmptyString(overrides.location) ?? brand.contact.location,
    },
    commerce: {
      currency: brand.commerce.currency,
      locale: brand.commerce.locale,
      checkoutMode: brand.commerce.checkoutMode,
      freeShippingThresholdCents:
        asNonNegativeNumber(overrides.freeShippingThresholdCents) ??
        brand.commerce.freeShippingThresholdCents,
      orderPrefix: asNonEmptyString(overrides.orderPrefix) ?? brand.commerce.orderPrefix,
    },
  };
}
