import Link from "next/link";

import { ProductGrid } from "@/components/product/product-grid";
import { buttonStyles } from "@/components/ui/button";
import type { Product } from "@/lib/domain/types";

/**
 * Productos relacionados
 * ============================================================================
 * Componente de servidor. La página de producto ya sabe cuáles son: se los pide
 * al repositorio y los recibe como prop. Aquí no hay nada que consultar, solo
 * que pintar, así que no se arrastra un cliente ni una consulta extra.
 *
 * POR QUÉ ESTÁ FUERA DE `ProductDetail`
 * `ProductDetail` es el bloque que necesita JavaScript (elegir talla, cambiar
 * cantidad, agregar a la bolsa). Los relacionados son contenido estático: si
 * vivieran dentro, cada visitante descargaría ese código sin poder interactuar
 * con nada, porque la selección de productos relacionados no cambia con la
 * variante elegida.
 */
export function RelatedProducts({ products }: { products: readonly Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="border-t border-line">
      <div className="container-ac py-section">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Del catálogo</span>
            <h2 className="mt-4 text-title">También te puede interesar</h2>
          </div>

          <Link
            href="/tienda"
            className={buttonStyles({ variant: "secondary" })}
          >
            Ver todo el catálogo
          </Link>
        </div>

        <ProductGrid products={products} columns={3} className="mt-12" />
      </div>
    </section>
  );
}
