/**
 * Modelo de dominio
 * ============================================================================
 * Contrato central de la tienda. Lo consumen la tienda pública, el carrito,
 * el checkout y (en la fase siguiente) el panel de administración.
 *
 * PRINCIPIO RECTOR: el catálogo se describe de forma genérica, no como
 * "playeras". Hoy solo vendemos oversize, pero nada en estos tipos asume eso.
 * Consecuencia práctica: cuando entren sudaderas, gorras o lo que sea, no hay
 * que migrar la base ni reescribir la interfaz — ya cabe.
 *
 * Los tres detalles que hacen que esto escale de verdad:
 *
 *  1. OPCIONES FLEXIBLES. Las variantes no tienen columnas `talla` y `color`.
 *     Tienen un mapa `opciones: { Talla: "L", Color: "Negro" }`. Así se pasa
 *     de 2 ejes a 4 (corte, tela, manga...) sin tocar el esquema.
 *
 *  2. DINERO EN CENTAVOS ENTEROS. Nunca decimales. Ver `lib/domain/money.ts`
 *     para la explicación del bug de punto flotante que esto evita.
 *
 *  3. IDENTIFICADORES DE TEXTO (no autoincrementales). Permiten generar datos
 *     en el cliente, hacer migraciones entre entornos y sembrar la base sin
 *     colisiones. `crypto.randomUUID()` los produce.
 */

import type { Currency } from "@/config/brand";

/* ============================================================================
   CATÁLOGO
   ============================================================================ */

/** Estado de publicación de un producto. */
export type ProductStatus = "draft" | "published" | "archived";

/**
 * Un eje de variación y sus valores posibles.
 * Ejemplo: { nombre: "Talla", valores: ["S","M","L","XL"] }
 */
export type ProductOption = {
  id: string;
  /** "Talla", "Color", "Corte". */
  name: string;
  /** Determina el orden de presentación de los selectores. */
  position: number;
  values: ProductOptionValue[];
};

/** Un valor concreto dentro de un eje. */
export type ProductOptionValue = {
  id: string;
  /** "L", "Negro". Es lo que ve el cliente. */
  value: string;
  /**
   * Color hexadecimal cuando el eje es un color. Permite renderizar muestras
   * de color reales en lugar de solo el nombre. `null` en otros ejes.
   */
  hexColor: string | null;
  position: number;
};

/**
 * Combinación vendible concreta: precio y stock propios.
 *
 * `optionValues` es un mapa `nombreEje → valor`. Es la pieza que hace que el
 * modelo soporte cualquier número de ejes. Ejemplo:
 *   { "Talla": "L", "Color": "Negro Hueso" }
 */
export type ProductVariant = {
  id: string;
  /** Código único de almacén. Único a nivel de toda la base. */
  sku: string;
  priceCents: number;
  /**
   * Precio anterior, para mostrarlo tachado. `null` si no hay promoción.
   * Nunca se usa directamente como precio de venta.
   */
  compareAtPriceCents: number | null;
  /** Unidades disponibles. `0` significa agotado. */
  stock: number;
  optionValues: Record<string, string>;
  /** Imagen específica de esta variante. `null` usa la principal. */
  imageId: string | null;
  /** Peso en gramos. Necesario para cotizar envío. */
  weightGrams: number | null;
};

/** Imagen de producto. */
export type ProductImage = {
  id: string;
  url: string;
  /**
   * Texto alternativo. Es obligatorio y no opcional: sirve a lectores de
   * pantalla y es un factor de posicionamiento en Google Imágenes.
   */
  alt: string;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
};

/** Ficha técnica: "Composición: 100% algodón". */
export type ProductDetail = {
  label: string;
  value: string;
};

/** Fila de la guía de medidas. Las claves son dinámicas por tipo de prenda. */
export type MeasurementRow = {
  /** "S", "M", "L". */
  size: string;
  /** Medidas en centímetros, por nombre. Ej: { pecho: 56, largo: 70 }. */
  values: Record<string, number>;
};

/** Metadatos de posicionamiento. */
export type ProductSeo = {
  title: string;
  description: string;
  imageId: string | null;
};

/** Producto completo. */
export type Product = {
  id: string;
  /** Identificador legible para la URL. Ej: "oversize-tee-negro-hueso". */
  slug: string;
  name: string;
  /** Una línea, para tarjetas y listados. */
  shortDescription: string;
  /** Texto largo, admite párrafos. */
  description: string;
  /** Slug de la categoría a la que pertenece. */
  category: string;
  tags: string[];
  status: ProductStatus;
  /** `true` lo muestra en la selección de la portada. */
  isFeatured: boolean;
  details: ProductDetail[];
  careInstructions: string[];
  measurements: MeasurementRow[];
  options: ProductOption[];
  variants: ProductVariant[];
  images: ProductImage[];
  seo: ProductSeo;
  /* ISO 8601. */
  createdAt: string;
  updatedAt: string;
};

/** Categoría del catálogo. */
export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  position: number;
};

/** Colección o cápsula: agrupa productos por criterio editorial. */
export type Collection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageId: string | null;
  /** IDs de los productos incluidos, en orden. */
  productIds: string[];
  isFeatured: boolean;
};

/* ============================================================================
   CARRITO
   ============================================================================ */

/**
 * Línea del carrito.
 *
 * Guarda datos desnormalizados (nombre, precio, imagen) a propósito: el
 * carrito debe poder pintarse completo sin consultar el catálogo. Además,
 * si un producto cambia de precio mientras alguien tiene el carrito abierto,
 * la interfaz sigue mostrando lo que esa persona vio, y el servidor es quien
 * valida el precio final al crear el pedido.
 */
export type CartLine = {
  /** Identifica la línea: producto + variante. */
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
  /** Tope que permitía el inventario al agregar. Se revalida al pagar. */
  maxStock: number;
};

/* ============================================================================
   PEDIDOS
   ============================================================================ */

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";

/** Método de entrega. Define el costo de envío aplicable. */
export type DeliveryMethod = "pickup" | "local" | "national";

export type PaymentMethod = "whatsapp" | "transfer" | "mercadopago";

/**
 * Artículo del pedido — una COPIA, no una referencia.
 *
 * Esto es deliberado y es de los detalles más importantes del modelo: se
 * guardan nombre, SKU y precio tal como estaban en el momento de la compra.
 * Si mañana subes el precio o borras el producto, el pedido histórico sigue
 * siendo exacto. Un pedido que cambia de total retroactivamente es un
 * problema contable y de confianza.
 */
export type OrderItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantSku: string;
  optionValues: Record<string, string>;
  /** Precio congelado en el momento de la compra. */
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  imageUrl: string;
};

export type OrderCustomer = {
  fullName: string;
  phone: string;
  email: string | null;
  postalCode: string;
  city: string;
  state: string;
  /** Instrucciones libres para la entrega. */
  notes: string | null;
};

/** Desglose económico. Todos los valores en centavos enteros. */
export type OrderTotals = {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
};

export type Order = {
  id: string;
  /** Folio corto legible. Ej: "AC-7F3K2". Es lo que se cita por WhatsApp. */
  folio: string;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  items: OrderItem[];
  customer: OrderCustomer;
  totals: OrderTotals;
  currency: Currency;
  /**
   * Notas internas del negocio. Nunca se muestran al cliente.
   * Ej: "pidió anticipo, transferencia recibida 18/09".
   */
  internalNotes: string | null;
  /* ISO 8601. */
  createdAt: string;
  updatedAt: string;
};
