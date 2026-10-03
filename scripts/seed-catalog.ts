/**
 * Siembra del catálogo en D1
 * ============================================================================
 * Vuelca `seedProducts` a las tablas de Cloudflare D1.
 *
 * POR QUÉ GENERA SQL Y NO USA UN CLIENTE
 * Un cliente de D1 en runtime necesita el contexto de Cloudflare, que solo
 * existe dentro de un Worker. Este script corre en tu máquina, en un proceso
 * de Node normal, donde ese contexto no existe. Generar un archivo `.sql` y
 * pasarlo a `wrangler d1 execute` evita dos cosas: pedirte un token de API de
 * Cloudflare con alcance de escritura en D1, y mantener una segunda ruta de
 * escritura contra la base que nadie recordaría limpiar.
 *
 * CÓMO SE USA
 *   node --experimental-strip-types scripts/seed-catalog.ts   (genera el SQL)
 *   pnpm wrangler d1 execute tienda-ac --remote --file=scripts/seed.sql
 *
 * El script solo ESCRIBE el archivo. No toca la base: quien la modifica es
 * Wrangler, en un paso explícito que se puede revisar antes de ejecutarlo.
 *
 * POR QUÉ ES IDEMPOTENTE
 * Todas las sentencias son `INSERT OR REPLACE`. Correrlo dos veces deja la
 * base en el mismo estado en lugar de duplicar el catálogo, que es lo que
 * pasa con un `INSERT` normal y por lo que este tipo de script se acaba
 * ejecutando más de una vez.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { seedProducts } from "../src/lib/data/seed-products.ts";
import type { Product } from "../src/lib/domain/types.ts";

const OUTPUT = join(dirname(fileURLToPath(import.meta.url)), "seed.sql");

/* ============================================================================
   ESCAPADO
   ============================================================================
   Los textos vienen de un archivo TypeScript, no de un formulario, así que la
   amenaza real aquí no es un atacante sino una comilla en la descripción de
   una playera. Aun así el escapado es el de manual: duplicar la comilla simple
   es la única defensa que SQLite entiende sin extensiones.
   ============================================================================ */
function text(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function int(value: number | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return String(Math.trunc(value));
}

function bool(value: boolean): string {
  return value ? "1" : "0";
}

/** Un literal JSON, guardado como TEXT y no parseado por SQLite. */
function json(value: unknown): string {
  return text(JSON.stringify(value));
}

/** "Oversize Clásica" -> "oversize-clasica". Sin acentos, sin símbolos. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * INSERT multilínea.
 *
 * Se escribe una fila por línea en lugar de un `VALUES` largo: un producto
 * con 40 variantes genera 200 líneas legibles, y cuando una migración falla a
 * medias se puede leer exactamente qué fila se insertó.
 */
function insert(table: string, row: Record<string, string>): string {
  const columns = Object.keys(row);
  const values = columns.map((column) => row[column]);
  return `INSERT OR REPLACE INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${values.join(", ")});`;
}

const statements: string[] = [];
const tagIds = new Map<string, string>();

/* ---------------------------------------------------------------------------
   PRODUCTOS
   --------------------------------------------------------------------------- */
for (const product of seedProducts) {
  statements.push(
    insert("products", {
      id: text(product.id),
      name: text(product.name),
      slug: text(product.slug),
      description: text(product.description),
      short_description: text(product.shortDescription),
      category: text(product.category),
      tags: json(product.tags),
      details: json(product.details),
      care_instructions: json(product.careInstructions),
      measurements: json(product.measurements),
      status: text(product.status),
      is_featured: bool(product.isFeatured),
      seo_title: text(product.seo.title),
      seo_description: text(product.seo.description),
      meta_image_id: text(product.seo.imageId),
      created_at: text(product.createdAt),
      updated_at: text(product.updatedAt),
    }),
  );
}

/* ---------------------------------------------------------------------------
   IMÁGENES
   --------------------------------------------------------------------------- */
for (const product of seedProducts) {
  for (const image of product.images) {
    statements.push(
      insert("product_images", {
        id: text(image.id),
        product_id: text(product.id),
        url: text(image.url),
        alt: text(image.alt),
        width: int(image.width),
        height: int(image.height),
        position: int(image.position),
        is_primary: bool(image.isPrimary),
      }),
    );
  }
}

/* ---------------------------------------------------------------------------
   OPCIONES Y SUS VALORES
   --------------------------------------------------------------------------- */
for (const product of seedProducts) {
  for (const option of product.options) {
    statements.push(
      insert("product_options", {
        id: text(option.id),
        product_id: text(product.id),
        name: text(option.name),
        position: int(option.position),
      }),
    );

    for (const value of option.values) {
      statements.push(
        insert("product_option_values", {
          id: text(value.id),
          option_id: text(option.id),
          value: text(value.value),
          hex_color: text(value.hexColor),
          position: int(value.position),
        }),
      );
    }
  }
}

/* ---------------------------------------------------------------------------
   VARIANTES
   --------------------------------------------------------------------------- */
for (const product of seedProducts) {
  for (const variant of product.variants) {
    statements.push(
      insert("product_variants", {
        id: text(variant.id),
        product_id: text(product.id),
        sku: text(variant.sku),
        option_values: json(variant.optionValues),
        price_cents: int(variant.priceCents),
        compare_at_price_cents: int(variant.compareAtPriceCents),
        stock: int(variant.stock),
        weight_grams: int(variant.weightGrams),
        image_id: text(variant.imageId),
      }),
    );
  }
}

/* ---------------------------------------------------------------------------
   TAGS
   ---------------------------------------------------------------------------
   Las etiquetas viven en dos sitios a propósito: dentro del JSON de
   `products.tags` para pintarlas, y en la tabla `tags` para poder filtrar con
   un índice en `/tienda?tag=oversize`. El `id` se deriva del slug para que
   dos ejecuciones del script produzcan exactamente los mismos identificadores.
   --------------------------------------------------------------------------- */
for (const product of seedProducts as readonly Product[]) {
  for (const tag of product.tags) {
    const slug = slugify(tag);
    const id = `tag_${slug}`;

    if (!tagIds.has(slug)) {
      tagIds.set(slug, id);
      statements.push(
        insert("tags", {
          id: text(id),
          name: text(tag),
          slug: text(slug),
        }),
      );
    }

    statements.push(
      insert("product_tags", {
        product_id: text(product.id),
        tag_id: text(id),
      }),
    );
  }
}

/* ---------------------------------------------------------------------------
   ESCRITURA
   --------------------------------------------------------------------------- */
const header = [
  "-- Semilla del catálogo AC",
  `-- Generado por scripts/seed-catalog.ts a partir de src/lib/data/seed-products.ts`,
  `-- ${statements.length} sentencias. Todas son INSERT OR REPLACE: se puede volver a ejecutar.`,
  "",
].join("\n");

writeFileSync(OUTPUT, header + statements.join("\n") + "\n", "utf8");

console.log(`SQL escrito en ${OUTPUT}`);
console.log(
  `${statements.length} sentencias para ${seedProducts.length} productos y ${tagIds.size} etiquetas.`,
);
