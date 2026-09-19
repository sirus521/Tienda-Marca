import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

type ProductGridProps = {
  products: readonly Product[];
  /** Columnas máximas en pantallas grandes. */
  columns?: 2 | 3 | 4;
  /** Carga inmediata de las primeras imágenes. Solo arriba del pliegue. */
  priorityCount?: number;
  className?: string;
};

const columnStyles: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Grid de productos.
 *
 * DECISIÓN: aquí NO hay animación de entrada por elemento.
 * Se probó con escalonado y el resultado es un grid que aparece "tarde": en
 * una tienda, el catálogo es el contenido que la persona vino a ver, y
 * retrasarlo —aunque sea 300 ms— se siente lento. La entrada escalonada se
 * reserva para los destacados de la portada, que sí son una revelación.
 *
 * En su lugar hay un hover real por tarjeta (segunda imagen) que aporta mucho
 * más valor de compra.
 */
export function ProductGrid({
  products,
  columns = 3,
  priorityCount = 0,
  className,
}: ProductGridProps) {
  if (products.length === 0) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-x-5 gap-y-12", columnStyles[columns], className)}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          /* Las primeras N imágenes se cargan con prioridad: son las que
             definen la métrica LCP del listado. */
          priority={index < priorityCount}
        />
      ))}
    </div>
  );
}
