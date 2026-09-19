import type { Product, ProductImage, ProductOption, ProductVariant } from "@/lib/domain/types";

/**
 * Catálogo semilla
 * ============================================================================
 * Datos de ejemplo con la MISMA forma que tendrá la base de datos. Cuando la
 * Fase 4 conecte Cloudflare D1, el repositorio empezará a devolver registros
 * reales y esta semilla quedará solo para desarrollo y pruebas.
 *
 * No es relleno decorativo: está construido para ejercitar los casos que la
 * interfaz tiene que saber resolver sin romperse.
 *
 *   · Producto con DOS ejes (Talla × Color) → 8 variantes, demuestra que el
 *     modelo soporta más de un eje sin cambios de esquema.
 *   · Producto con rango de precios → la tarjeta debe mostrar "desde $X".
 *   · Variante agotada (stock 0) → el selector de talla debe deshabilitarla.
 *   · Stock bajo → activa el aviso "últimas piezas".
 *   · Precio comparativo → muestra el "antes" tachado y el porcentaje.
 */

const SEEDED_AT = "2026-09-18T12:00:00.000Z";

/* Los dos placeholders provisionales, en proporción 4:5 — igual que las fotos
   que se subirán al panel, para que el layout no se mueva al reemplazarlas. */
const PLACEHOLDER = {
  bone: { url: "/placeholder/tee-bone.svg", width: 800, height: 1000 },
  ink: { url: "/placeholder/tee-ink.svg", width: 800, height: 1000 },
} as const;

/** Par de imágenes de un producto: frontal y detalle. */
function productImages(
  id: string,
  first: keyof typeof PLACEHOLDER,
  productName: string,
): ProductImage[] {
  const second: keyof typeof PLACEHOLDER = first === "bone" ? "ink" : "bone";

  return [
    {
      id: `${id}-img-1`,
      url: PLACEHOLDER[first].url,
      alt: `${productName} — vista frontal`,
      width: PLACEHOLDER[first].width,
      height: PLACEHOLDER[first].height,
      position: 0,
      isPrimary: true,
    },
    {
      id: `${id}-img-2`,
      url: PLACEHOLDER[second].url,
      alt: `${productName} — detalle de textura`,
      width: PLACEHOLDER[second].width,
      height: PLACEHOLDER[second].height,
      position: 1,
      isPrimary: false,
    },
  ];
}

/** Eje de tallas. */
function sizeOption(id: string, sizes: readonly string[]): ProductOption {
  return {
    id: `${id}-opt-talla`,
    name: "Talla",
    position: 0,
    values: sizes.map((value, index) => ({
      id: `${id}-talla-${value.toLowerCase()}`,
      value,
      hexColor: null,
      position: index,
    })),
  };
}

/** Eje de color, con muestra hexadecimal real para los selectores. */
function colorOption(id: string, colors: readonly { value: string; hex: string }[]): ProductOption {
  return {
    id: `${id}-opt-color`,
    name: "Color",
    position: 1,
    values: colors.map((color, index) => ({
      id: `${id}-color-${index}`,
      value: color.value,
      hexColor: color.hex,
      position: index,
    })),
  };
}

type VariantSpec = {
  /** Sufijo del SKU. Ej: "BR-S" produce "AC-001-BR-S". */
  key: string;
  optionValues: Record<string, string>;
  stock: number;
};

/** Construye las variantes aplicando el mismo precio a todas. */
function variants(
  id: string,
  skuPrefix: string,
  specs: readonly VariantSpec[],
  priceCents: number,
  compareAtPriceCents: number | null = null,
): ProductVariant[] {
  return specs.map((spec, index) => ({
    id: `${id}-var-${index + 1}`,
    sku: `${skuPrefix}-${spec.key}`,
    priceCents,
    compareAtPriceCents,
    stock: spec.stock,
    optionValues: spec.optionValues,
    imageId: null,
    weightGrams: 260,
  }));
}

/* ============================================================================
   PRODUCTOS
   ============================================================================ */

/** Producto principal: dos ejes (Talla × Color), 8 variantes, una agotada. */
const oversizeClasica: Product = (() => {
  const id = "prod-001";
  const name = "Oversize Tee 240 — Clásica";
  const colors = [
    { value: "Blanco Roto", hex: "#efede7" },
    { value: "Negro Hueso", hex: "#141412" },
  ] as const;

  return {
    id,
    slug: "oversize-tee-240-clasica",
    name,
    shortDescription: "Algodón peinado de 240 g. Corte boxy, hombro caído.",
    description:
      "La base de todo. Algodón peinado de 240 gramos con corte boxy que cae recto y no se pega al cuerpo. El cuello lleva doble costura para que no se deforme con el uso, y el ruedo ancho mantiene la caída después de lavar.",
    category: "playeras",
    tags: ["clásica", "algodón pesado", "boxy"],
    status: "published",
    isFeatured: true,
    details: [
      { label: "Composición", value: "100% algodón peinado" },
      { label: "Gramaje", value: "240 g/m²" },
      { label: "Corte", value: "Boxy oversize" },
      { label: "Cuello", value: "Doble costura reforzada" },
      { label: "Origen", value: "Confeccionada en México" },
    ],
    careInstructions: [
      "Lavar a máquina en frío, del revés",
      "No usar blanqueador",
      "Secar a temperatura baja o al aire",
      "Planchar del revés si es necesario",
    ],
    measurements: [
      { size: "S", values: { pecho: 54, largo: 68, hombro: 50 } },
      { size: "M", values: { pecho: 57, largo: 70, hombro: 52 } },
      { size: "L", values: { pecho: 60, largo: 72, hombro: 54 } },
      { size: "XL", values: { pecho: 63, largo: 74, hombro: 56 } },
    ],
    options: [sizeOption(id, ["S", "M", "L", "XL"]), colorOption(id, colors)],
    variants: variants(id, "AC-001", [
      { key: "BR-S", optionValues: { Talla: "S", Color: "Blanco Roto" }, stock: 12 },
      { key: "BR-M", optionValues: { Talla: "M", Color: "Blanco Roto" }, stock: 18 },
      { key: "BR-L", optionValues: { Talla: "L", Color: "Blanco Roto" }, stock: 9 },
      /* Agotada a propósito: el selector de talla debe deshabilitarla. */
      { key: "BR-XL", optionValues: { Talla: "XL", Color: "Blanco Roto" }, stock: 0 },
      { key: "NH-S", optionValues: { Talla: "S", Color: "Negro Hueso" }, stock: 7 },
      { key: "NH-M", optionValues: { Talla: "M", Color: "Negro Hueso" }, stock: 14 },
      /* Stock bajo: activa el aviso de últimas piezas. */
      { key: "NH-L", optionValues: { Talla: "L", Color: "Negro Hueso" }, stock: 3 },
      { key: "NH-XL", optionValues: { Talla: "XL", Color: "Negro Hueso" }, stock: 6 },
    ], 54_900),
    images: productImages(id, "bone", name),
    seo: {
      title: "Oversize Tee 240 — Clásica | Algodón pesado",
      description:
        "Playera oversize de algodón peinado 240 g con corte boxy y cuello reforzado. En Blanco Roto y Negro Hueso.",
      imageId: `${id}-img-1`,
    },
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
})();

/**
 * Producto con RANGO DE PRECIOS y precio comparativo.
 * La tarjeta debe mostrar "desde $X" y el "antes" tachado con el porcentaje.
 */
const oversizeHeavy: Product = (() => {
  const id = "prod-002";
  const name = "Oversize Heavy 300 — Crest";
  const colors = [
    { value: "Negro Hueso", hex: "#141412" },
    { value: "Arena", hex: "#c9bfa8" },
  ] as const;

  return {
    id,
    slug: "oversize-heavy-300-crest",
    name,
    shortDescription: "Algodón de 300 g con monograma bordado al pecho.",
    description:
      "La pieza más pesada de la casa. Algodón de 300 gramos: sostiene la forma sin tabla y cae con peso propio. Lleva el monograma bordado al pecho, no estampado, para que aguante lavados sin cuartearse.",
    category: "playeras",
    tags: ["crest", "bordado", "algodón pesado"],
    status: "published",
    isFeatured: true,
    details: [
      { label: "Composición", value: "100% algodón" },
      { label: "Gramaje", value: "300 g/m²" },
      { label: "Corte", value: "Boxy oversize" },
      { label: "Detalle", value: "Monograma bordado al pecho" },
      { label: "Origen", value: "Confeccionada en México" },
    ],
    careInstructions: [
      "Lavar a máquina en frío, del revés",
      "No usar blanqueador",
      "Secar a temperatura baja o al aire",
      "No planchar sobre el bordado",
    ],
    measurements: [
      { size: "M", values: { pecho: 58, largo: 71, hombro: 53 } },
      { size: "L", values: { pecho: 61, largo: 73, hombro: 55 } },
      { size: "XL", values: { pecho: 64, largo: 75, hombro: 57 } },
    ],
    options: [sizeOption(id, ["M", "L", "XL"]), colorOption(id, colors)],
    /*
      Precios distintos por color a propósito: es el caso que obliga a la
      interfaz a mostrar "desde $X" en lugar de un precio único, y a que el
      detalle del producto actualice el precio al cambiar de variante.
    */
    variants: [
      {
        id: `${id}-var-1`,
        sku: "AC-002-NH-M",
        priceCents: 64_900,
        compareAtPriceCents: 79_900,
        stock: 6,
        optionValues: { Talla: "M", Color: "Negro Hueso" },
        imageId: null,
        weightGrams: 320,
      },
      {
        id: `${id}-var-2`,
        sku: "AC-002-NH-L",
        priceCents: 64_900,
        compareAtPriceCents: 79_900,
        stock: 8,
        optionValues: { Talla: "L", Color: "Negro Hueso" },
        imageId: null,
        weightGrams: 320,
      },
      {
        id: `${id}-var-3`,
        sku: "AC-002-NH-XL",
        priceCents: 64_900,
        compareAtPriceCents: 79_900,
        stock: 3,
        optionValues: { Talla: "XL", Color: "Negro Hueso" },
        imageId: null,
        weightGrams: 320,
      },
      {
        id: `${id}-var-4`,
        sku: "AC-002-AR-M",
        priceCents: 69_900,
        compareAtPriceCents: null,
        stock: 5,
        optionValues: { Talla: "M", Color: "Arena" },
        imageId: null,
        weightGrams: 320,
      },
      {
        id: `${id}-var-5`,
        sku: "AC-002-AR-L",
        priceCents: 69_900,
        compareAtPriceCents: null,
        stock: 2,
        optionValues: { Talla: "L", Color: "Arena" },
        imageId: null,
        weightGrams: 320,
      },
      {
        id: `${id}-var-6`,
        sku: "AC-002-AR-XL",
        priceCents: 69_900,
        compareAtPriceCents: null,
        stock: 0,
        optionValues: { Talla: "XL", Color: "Arena" },
        imageId: null,
        weightGrams: 320,
      },
    ],
    images: productImages(id, "ink", name),
    seo: {
      title: "Oversize Heavy 300 — Crest | Bordado",
      description:
        "Playera oversize de algodón 300 g con monograma bordado. Corte boxy de caída pesada, en Negro Hueso y Arena.",
      imageId: `${id}-img-1`,
    },
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
})();

/**
 * Producto en BORRADOR.
 * No debe aparecer nunca en la tienda pública. Se incluye a propósito: es la
 * forma de comprobar que el filtro de publicación del repositorio funciona.
 * Si este producto se ve en la tienda, el filtro está roto.
 */
const oversizeDrop: Product = (() => {
  const id = "prod-003";
  const name = "Oversize Tee — Drop 001";
  const colors = [{ value: "Bronce Lavado", hex: "#8c7a5b" }] as const;

  return {
    id,
    slug: "oversize-tee-drop-001",
    name,
    shortDescription: "Tinte lavado en tono bronce. Edición limitada.",
    description:
      "Teñida a mano en tono bronce y lavada en piedra para un acabado desigual: no hay dos piezas iguales. Edición de 40 unidades numeradas.",
    category: "playeras",
    tags: ["drop", "edición limitada", "teñido a mano"],
    status: "draft",
    isFeatured: false,
    details: [
      { label: "Composición", value: "100% algodón peinado" },
      { label: "Gramaje", value: "240 g/m²" },
      { label: "Tinte", value: "Teñido a mano, lavado en piedra" },
      { label: "Edición", value: "40 unidades numeradas" },
    ],
    careInstructions: [
      "Lavar por separado las primeras veces",
      "Lavar a máquina en frío, del revés",
      "Secar a la sombra",
    ],
    measurements: [
      { size: "M", values: { pecho: 57, largo: 70, hombro: 52 } },
      { size: "L", values: { pecho: 60, largo: 72, hombro: 54 } },
    ],
    options: [sizeOption(id, ["M", "L"]), colorOption(id, colors)],
    variants: variants(
      id,
      "AC-003",
      [
        { key: "BL-M", optionValues: { Talla: "M", Color: "Bronce Lavado" }, stock: 10 },
        { key: "BL-L", optionValues: { Talla: "L", Color: "Bronce Lavado" }, stock: 10 },
      ],
      59_900,
    ),
    images: productImages(id, "bone", name),
    seo: {
      title: "Oversize Tee — Drop 001 | Edición limitada",
      description: "Playera oversize teñida a mano en bronce. Edición de 40 unidades numeradas.",
      imageId: `${id}-img-1`,
    },
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  };
})();

export const seedProducts: readonly Product[] = [oversizeClasica, oversizeHeavy, oversizeDrop];