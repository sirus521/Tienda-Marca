/**
 * Identidad de marca — AC
 * ============================================================================
 * ÚNICO lugar donde se define quién es la marca. Los componentes nunca
 * escriben strings de marca a mano: todo se lee desde aquí.
 *
 * La marca todavía no tiene nombre comercial, así que el wordmark es el
 * monograma `AC` más el lockup "EST. 2026" tomados del logo.
 * Cuando exista nombre definitivo: cambiar `name` y `legalName` en este
 * archivo y toda la tienda lo refleja, sin tocar componentes.
 */

/** Canales de cobro soportados. */
export type CheckoutMode = "whatsapp" | "mercadopago";

/** Monedas soportadas por el formateador de precios. */
export type Currency = "MXN" | "USD";

export const brand = {
  /* ---------------------------------------------------------------- */
  /* Identidad                                                         */
  /* ---------------------------------------------------------------- */
  identity: {
    /** Monograma. Es el logo. */
    monogram: "AC",
    /** Wordmark visible (provisional hasta que exista nombre). */
    name: "AC",
    /** Nombre para documentos legales y facturación. */
    legalName: "AC",
    /** Año de fundación — se muestra como "EST. 2026". */
    foundedYear: 2026,
    /** Bajada de marca, usada en hero y metadatos. */
    tagline: "Playeras oversize de peso pesado.",
    /** Descripción larga para SEO, redes y Open Graph. */
    description:
      "Playeras oversize de algodón pesado, corte boxy y acabado crudo. Confeccionadas para durar años, no temporadas.",
  },

  /* ---------------------------------------------------------------- */
  /* Contacto                                                          */
  /* ---------------------------------------------------------------- */
  /* El número vive aquí y en ningún otro archivo. Lo consume el checkout,
     la lista de avisos y el pie de página. Cambiar de número es cambiar
     esta línea. */
  contact: {
    /** Solo dígitos, con código de país y sin "+". Ejemplo: "528112345678". */
    whatsapp: "527151447984",
    /** Mensaje que se precarga al abrir la conversación. */
    whatsappGreeting: "¡Hola AC! Vengo de la tienda en línea.",
    /** Correo de atención a clientes. */
    email: "",
    /** Usuario de Instagram, sin "@". */
    instagram: "",
    /** Origen, usado en páginas legales y de envíos. */
    location: "Monterrey, Nuevo León, México",
  },

  /* ---------------------------------------------------------------- */
  /* Comercio                                                          */
  /* ---------------------------------------------------------------- */
  commerce: {
    currency: "MXN" as Currency,
    locale: "es-MX",
    /** Modo de cobro activo. Conmutar a "mercadopago" cuando haya llaves. */
    checkoutMode: "whatsapp" as CheckoutMode,
    /** Envío gratis a partir de este monto, en centavos. */
    freeShippingThresholdCents: 150_000,
    /** Prefijo de los folios de pedido. Ejemplo: AC-7F3K2 */
    orderPrefix: "AC",
  },
} as const satisfies {
  identity: {
    monogram: string;
    name: string;
    legalName: string;
    foundedYear: number;
    tagline: string;
    description: string;
  };
  contact: {
    whatsapp: string;
    whatsappGreeting: string;
    email: string;
    instagram: string;
    location: string;
  };
  commerce: {
    currency: Currency;
    locale: string;
    checkoutMode: CheckoutMode;
    freeShippingThresholdCents: number;
    orderPrefix: string;
  };
};

/** Contrato de la marca. Útil para inyectar configuración en tests. */
export type Brand = typeof brand;

/**
 * `true` solo cuando hay un número de WhatsApp usable.
 * El checkout lo consulta para no generar pedidos que nadie va a recibir.
 */
export function isContactConfigured(): boolean {
  return brand.contact.whatsapp.trim().length >= 10;
}

/** Año de fundación formateado como aparece en el lockup del logo. */
export const establishedLabel = `EST. ${brand.identity.foundedYear}`;
