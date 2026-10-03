import { sqliteTable, text, integer, index, primaryKey, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/* ==================================================================
   ESQUEMA DE LA TIENDA — AC
   ==================================================================
   Base SQLite para Cloudflare D1. Todas las claves primarias son
   `text` (UUID v4), nunca autoincrementales. Los precios están en
   centavos enteros. Las listas (tags, opciones, detalles) se guardan
   como JSON TEXT para no sobre-normalizar.

   FORMATO DE LAS FECHAS
   Todas las marcas de tiempo son ISO 8601 en UTC ("2026-04-01T12:00:00.000Z"),
   que es lo que declara el tipo `Product.createdAt` en `lib/domain/types.ts`.
   Los valores por defecto usan `strftime` y no `unixepoch()`: `unixepoch`
   escribe segundos desde 1970, y mezclar ambos formatos en la misma columna
   rompe el orden cronológico —"1758000000" se ordena antes que
   "2026-04-01..."— además de producir fechas ilegibles al mostrarlas.

   Tablas: products, productImages, productVariants, productOptions,
   productOptionValues, tags, productTags, collections,
   collectionProducts, orders, orderItems, orderStatusHistory,
   adminUsers, adminAccounts, sessionTokens, authVerifications,
   auditLogs, settings

   NOTA SOBRE LAS TABLAS DE AUTENTICACIÓN
   `adminUsers`, `adminAccounts`, `sessionTokens` y `authVerifications`
   siguen el contrato de better-auth (nombres de columna que espera
   `drizzleAdapter`), pero con el plural y el snake_case del proyecto.
   El mapeo entre ambos mundos va en la configuración de better-auth.
   ================================================================= */

/* ------------------------------------------------------------------
   PRODUCTS
   ------------------------------------------------------------------
   `details`, `careInstructions` y `measurements` son JSON TEXT porque
   son listas heterogéneas y poco consultables: se pintan, no se
   filtran. Meterlos en tablas propias daría joins sin ganancia.
   ------------------------------------------------------------------ */
export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    shortDescription: text("short_description"),
    category: text("category").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    /* JSON: [{ label, value }] — ficha técnica. */
    details: text("details").notNull().default("[]"),
    /* JSON: string[] — instrucciones de lavado. */
    careInstructions: text("care_instructions").notNull().default("[]"),
    /* JSON: [{ size, values: Record<string, number> }] — guía de medidas. */
    measurements: text("measurements").notNull().default("[]"),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    metaImageId: text("meta_image_id"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    /* El índice sobre `slug` sobra: `.unique()` ya crea su propio índice.
       Un duplicado solo gasta espacio de escritura. */
    nameIdx: index("products_name_idx").on(table.name),
    statusIdx: index("products_status_idx").on(table.status),
    featuredIdx: index("products_featured_idx").on(table.isFeatured),
  }),
);

/* ------------------------------------------------------------------
   PRODUCT IMAGES
   ------------------------------------------------------------------ */
export const productImages = sqliteTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt").notNull().default(""),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    position: integer("position").notNull().default(0),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    productIdIdx: index("product_images_product_id_idx").on(table.productId),
  }),
);

/* ------------------------------------------------------------------
   PRODUCT VARIANTS
   ------------------------------------------------------------------ */
export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    /* JSON: { Talla: "L", Color: "Negro" } */
    optionValues: text("option_values").notNull().default("{}"),
    priceCents: integer("price_cents").notNull(),
    compareAtPriceCents: integer("compare_at_price_cents"),
    stock: integer("stock").notNull().default(0),
    weightGrams: integer("weight_grams"),
    imageId: text("image_id"),
  },
  (table) => ({
    productIdIdx: index("product_variants_product_id_idx").on(table.productId),
    /* POR QUÉ UNA RESTRICCIÓN Y NO SÓLO CUIDADO EN EL CÓDIGO
       D1 no admite transacciones interactivas: no se puede abrir un BEGIN,
       comprobar el stock y cerrarlo. Lo más parecido a eso es `batch()`, que
       ejecuta el grupo en una transacción implícita.

       Con esa restricción, dos compras simultáneas de la última unidad no
       pueden consumirla dos veces: el segundo `UPDATE` dejaría el stock en
       -1, viola el CHECK, y `batch()` revierte el grupo entero incluido el
       pedido. Es la base de datos aplicando la regla, no el servidor
       confiando en que nadie llegó antes. */
    stockNonNegative: check("product_variants_stock_nonneg", sql`${table.stock} >= 0`),
  }),
);

/* ------------------------------------------------------------------
   PRODUCT OPTIONS (ejes de variación)
   ------------------------------------------------------------------ */
export const productOptions = sqliteTable(
  "product_options",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    productIdIdx: index("product_options_product_id_idx").on(table.productId),
  }),
);

/* ------------------------------------------------------------------
   PRODUCT OPTION VALUES
   ------------------------------------------------------------------ */
export const productOptionValues = sqliteTable(
  "product_option_values",
  {
    id: text("id").primaryKey(),
    optionId: text("option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    hexColor: text("hex_color"),
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    optionIdIdx: index("product_option_values_option_id_idx").on(table.optionId),
  }),
);

/* ------------------------------------------------------------------
   TAGS
   ------------------------------------------------------------------
   Etiquetas de catálogo. Existen como tabla propia —y no solo dentro del
   JSON de `products.tags`— para poder filtrar `/tienda?tag=oversize`
   con un índice en vez de un LIKE sobre texto JSON.
   ------------------------------------------------------------------ */
export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
  },
  (table) => ({
    slugIdx: index("tags_slug_idx").on(table.slug),
  }),
);

/* ------------------------------------------------------------------
   PRODUCT TAGS (n:m)
   ------------------------------------------------------------------ */
export const productTags = sqliteTable(
  "product_tags",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.tagId] }),
    tagIdIdx: index("product_tags_tag_id_idx").on(table.tagId),
  }),
);

/* ------------------------------------------------------------------
   COLLECTIONS
   ------------------------------------------------------------------ */
export const collections = sqliteTable(
  "collections",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    imageId: text("image_id"),
    isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
    isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    slugIdx: index("collections_slug_idx").on(table.slug),
  }),
);

/* ------------------------------------------------------------------
   COLLECTION PRODUCTS (n:m con orden)
   ------------------------------------------------------------------
   `position` es el orden editorial dentro de la colección. Un capsule
   no es un filtro alfabético.
   ------------------------------------------------------------------ */
export const collectionProducts = sqliteTable(
  "collection_products",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.collectionId, table.productId] }),
    productIdIdx: index("collection_products_product_id_idx").on(table.productId),
  }),
);

/* ------------------------------------------------------------------
   ORDERS
   ==================================================================
   El desglose del cliente se desnormaliza en columnas propias en vez
   de una tabla `customers`: una tienda pequeña no gana nada con
   normalizar a personas que casi siempre compran una vez.

   `folio` es el identificador corto y legible que se cita por WhatsApp
   ("AC-7F3K2"). Tiene índice único aparte del `id` porque se busca por
   folio, no por UUID.
   ------------------------------------------------------------------ */
export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    folio: text("folio").notNull().unique(),
    status: text("status", {
      enum: ["new", "confirmed", "shipped", "delivered", "cancelled"],
    })
      .notNull()
      .default("new"),
    deliveryMethod: text("delivery_method", {
      enum: ["pickup", "local", "national"],
    })
      .notNull()
      .default("pickup"),
    paymentMethod: text("payment_method", {
      enum: ["whatsapp", "transfer", "mercadopago"],
    })
      .notNull()
      .default("whatsapp"),

    /* Cliente */
    customerFullName: text("customer_full_name").notNull(),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    customerPostalCode: text("customer_postal_code").notNull().default(""),
    customerCity: text("customer_city").notNull().default(""),
    customerState: text("customer_state").notNull().default(""),
    customerNotes: text("customer_notes"),

    /* Totales, en centavos enteros. */
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull().default(0),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: text("currency").notNull().default("MXN"),

    /* Solo para el negocio. Nunca se devuelve al cliente. */
    internalNotes: text("internal_notes"),

    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    statusIdx: index("orders_status_idx").on(table.status),
    /* El panel lista los pedidos más recientes primero. */
    createdAtIdx: index("orders_created_at_idx").on(table.createdAt),
    phoneIdx: index("orders_customer_phone_idx").on(table.customerPhone),
  }),
);

/* ------------------------------------------------------------------
   ORDER ITEMS
   ==================================================================
   COPIAS, no referencias. Se guardan nombre, SKU y precio tal como
   estaban al comprar. Si mañana sube el precio o se borra el
   producto, el pedido histórico sigue siendo exacto: un pedido que
   cambia de total retroactivamente es un problema contable.

   `variantId` y `productId` NO llevan clave foránea a propósito. La
   fuente de verdad histórica es esta fila; si el producto desaparece
   de la base, el pedido no debe romperse ni perder información.
   ------------------------------------------------------------------ */
export const orderItems = sqliteTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: text("variant_id").notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    variantSku: text("variant_sku").notNull(),
    /* JSON: { Talla: "L", Color: "Negro" } */
    optionValues: text("option_values").notNull().default("{}"),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    imageUrl: text("image_url").notNull().default(""),
    position: integer("position").notNull().default(0),
  },
  (table) => ({
    orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
  }),
);

/* ------------------------------------------------------------------
   ORDER STATUS HISTORY
   ==================================================================
   Auditoría del cambio de estado. Un pedido que pasa de "nuevo" a
   "enviado" y luego a "cancelado" necesita dejar rastro de por qué:
   sin este historial, "se canceló" y "nunca llegó" son la misma cosa.
   ------------------------------------------------------------------ */
export const orderStatusHistory = sqliteTable(
  "order_status_history",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    changedBy: text("changed_by"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    orderIdIdx: index("order_status_history_order_id_idx").on(table.orderId),
  }),
);

/* ------------------------------------------------------------------
   ADMIN USERS
   ==================================================================
   Columnas alineadas con el contrato de better-auth: `emailVerified`,
   `createdAt` y `updatedAt` son las que el adaptador espera leer y
   escribir. `role` y `isActive` son extensiones propias.
   ------------------------------------------------------------------ */
export const adminUsers = sqliteTable(
  "admin_users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    role: text("role", { enum: ["owner", "editor"] }).notNull().default("editor"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    lastLoginAt: text("last_login_at"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    emailIdx: index("admin_users_email_idx").on(table.email),
  }),
);

/* ------------------------------------------------------------------
   ADMIN ACCOUNTS
   ==================================================================
   Credenciales y vínculos con proveedores externos. Se separan de
   `admin_users` porque un usuario puede tener varias cuentas (Google,
   GitHub) y más de una fila con el mismo `userId` es normal.
   ------------------------------------------------------------------ */
export const adminAccounts = sqliteTable(
  "admin_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: text("access_token_expires_at"),
    refreshTokenExpiresAt: text("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    userIdIdx: index("admin_accounts_user_id_idx").on(table.userId),
  }),
);

/* ------------------------------------------------------------------
   SESSION TOKENS
   ------------------------------------------------------------------ */
export const sessionTokens = sqliteTable(
  "session_tokens",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    userIdIdx: index("session_tokens_user_id_idx").on(table.userId),
    tokenIdx: index("session_tokens_token_idx").on(table.token),
  }),
);

/* ------------------------------------------------------------------
   AUTH VERIFICATIONS
   ==================================================================
   Tokens de un solo uso: recuperar contraseña, verificar correo.
   Se limpian por `expiresAt`, no por crescer sin control.
   ------------------------------------------------------------------ */
export const authVerifications = sqliteTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    identifierIdx: index("auth_verifications_identifier_idx").on(table.identifier),
  }),
);

/* ------------------------------------------------------------------
   AUDIT LOGS
   ==================================================================
   Qué pasó, quién lo hizo y sobre qué entidad. Sirve para responder
   "¿quién cambió el precio de esto?" sin instrumentar cada pantalla.
   ------------------------------------------------------------------ */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    /* JSON con el antes/después. */
    payload: text("payload"),
    createdAt: text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (table) => ({
    entityIdx: index("audit_logs_entity_idx").on(table.entity),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  }),
);

/* ------------------------------------------------------------------
   SETTINGS
   ==================================================================
   Clave/valor para lo que el negocio cambia sin desplegar: número de
   WhatsApp, umbral de envío gratis, redes sociales, claves de la
   plantilla de mensajes. El JSON evita migraciones por cada campo
   nuevo; leer siempre pasa por el repositorio, que le aplica tipo.
   ------------------------------------------------------------------ */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default("{}"),
  updatedAt: text("updated_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
});
