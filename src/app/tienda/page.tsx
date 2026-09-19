import type { Metadata } from "next";
import Link from "next/link";

import { ProductFilters } from "@/components/product/product-filters";
import { ProductGrid } from "@/components/product/product-grid";
import { buttonStyles } from "@/components/ui/button";
import { listAvailableSizes, listProducts, listTags, type ProductSort } from "@/lib/data/catalog-repository";

/**
 * Tienda — listado completo
 * ============================================================================
 * FILTRADO EN EL SERVIDOR, ESTADO EN LA URL
 * Los filtros de talla, etiqueta y orden viven en `searchParams`. Eso significa
 * que el servidor entrega el HTML ya filtrado: no hay estado de carga, no hay
 * parpadeo, no hay JavaScript implicado, y cada combinación de filtros tiene su
 * propia URL indexable y compartible.
 *
 * La alternativa —filtrar en el cliente con estado de React— obligaría a
 * descargar todo el catálogo para luego esconder la mitad, y dejaría a los
 * buscadores y a las previsualizaciones de enlaces viendo solo la vista por
 * defecto.
 *
 * LÍMITE HONESTO
 * Con cientos de productos el filtrado seguiría funcionando, pero conviene
 * pasar la paginación al servidor (o a la consulta SQL). Hoy el catálogo es
 * corto y traerlo completo es lo más simple y lo más rápido.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tienda",
  description:
    "Todas las playeras oversize disponibles: algodón pesado, corte boxy y producción en lotes cortos.",
  alternates: { canonical: "/tienda" },
};

/** Normaliza los parámetros de la URL. Cualquier valor raro se ignora. */
function parseFilters(searchParams: Record<string, string | string[] | undefined>): {
  talla?: string;
  etiqueta?: string;
  orden: ProductSort;
} {
  const first = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;

  const SORTS: ProductSort[] = ["recientes", "precio-asc", "precio-desc", "nombre"];
  const orden = first(searchParams.orden);

  return {
    talla: first(searchParams.talla),
    etiqueta: first(searchParams.etiqueta),
    /* Nunca se confía en la URL: si el valor no está en la lista, se usa el
       orden por defecto en lugar de propagar basura a la consulta. */
    orden: SORTS.includes(orden as ProductSort) ? (orden as ProductSort) : "recientes",
  };
}

export default async function TiendaPage({
  searchParams,
}: {
  /* En Next 16 `searchParams` es una promesa: hay que resolverla antes de leer. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);

  /* Las tres consultas son independientes: se lanzan a la vez en lugar de una
     tras otra. En un archivo local da igual, pero cuando esto sea SQL contra D1,
     encadenarlas sumaría latencias. */
  const [products, sizes, tags] = await Promise.all([
    listProducts({
      size: filters.talla,
      tag: filters.etiqueta,
      sort: filters.orden,
    }),
    listAvailableSizes(),
    listTags(),
  ]);

  return (
    <div className="pb-section">
      {/* ---------------- Encabezado ---------------- */}
      <header className="container-ac pt-16 pb-12">
        <span className="eyebrow">Catálogo</span>
        <h1 className="mt-5 text-display">La tienda</h1>
        <p className="mt-6 max-w-lg text-lead text-ash">
          Todo lo que está disponible ahora. Producción corta: cuando se agota una talla, tarda en
          volver.
        </p>
      </header>

      <ProductFilters
        current={{ talla: filters.talla, etiqueta: filters.etiqueta, orden: filters.orden }}
        availableSizes={sizes}
        availableTags={tags}
        resultCount={products.length}
      />

      {/* ---------------- Resultados ---------------- */}
      <div className="container-ac pt-12">
        {products.length > 0 ? (
          <ProductGrid products={products} columns={3} priorityCount={3} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/**
 * Estado vacío.
 *
 * POR QUÉ NO ES UN SIMPLE "No hay resultados"
 * Un callejón sin salida es donde se pierde una venta. Aquí se explica qué
 * pasó y se ofrece la salida más probable: quitar los filtros. Y se mantiene
 * el tono de la marca en lugar de un mensaje de sistema.
 */
function EmptyState() {
  return (
    <div className="border border-line px-6 py-20 text-center">
      <p className="eyebrow">Sin resultados</p>

      <h2 className="mt-5 text-heading">No hay nada con esos filtros</h2>

      <p className="mx-auto mt-4 max-w-sm text-ash">
        Puede que esa talla se haya agotado en las piezas que filtramos. Quita los filtros para ver
        todo el catálogo.
      </p>

      <div className="mt-9 flex justify-center">
        <Link href="/tienda" className={buttonStyles({ variant: "secondary" })}>
          Ver todo
        </Link>
      </div>
    </div>
  );
}