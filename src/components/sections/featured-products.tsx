import type { Product } from "@/lib/domain/types";

import { getFeaturedProducts } from "@/lib/data/catalog-repository";
import { ProductCard } from "@/components/product/product-card";

/**
 * Sección de productos destacados.
 * ===========================================================================
 * El componente de sección completo que carga productos desde el repositorio
 * y los renderiza en una cuadrícula. Es el que usa `page.tsx`.
 *
 * Orden y ritmo:
 *   · Hero           papel  · impacto tipográfico, la promesa
 *   · Destacados     papel  · el producto (lo que la persona vino a ver)
 *   · Banda          tinta  · corte visual, respiro, movimiento continuo
 *   · Story          papel  · por qué la marca, con scroll narrativo
 *   · Valores        hueso  · los compromisos, en columnas cortas
 *   · Avisos         papel  · cierre con acción
 *
 * Renderizado estático con ISR (revalidación cada 5 minutos). El catálogo
 * cambia poco, así que no tiene sentido consultar la base de datos en cada
 * visita: se sirve desde el borde y se regenera cada 5 minutos. Cuando el
 * panel de administración publique un producto, se invalidará esta ruta al
 * instante con `revalidatePath`, sin esperar a que expire.
 */
export async function FeaturedProducts() {
  const products = await getFeaturedProducts(4);

  if (products.length === 0) {
    return (
      <section className="border-t border-line">
        <div className="container-ac py-20 lg:py-28">
          <p className="text-sm text-ash">Cargando productos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-line">
      <div className="container-ac py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={index < 2}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Cuadrícula de productos.
 *
 * Componente interno reutilizable para grids de productos en otras secciones.
 *
 * Lo que hace responsable a este bloque:
 *   · El grid usa clases con breakpoint, no media queries en un archivo
 *     separado. Grilla CSS puro, sin JavaScript, sin fallback. En móvil es
 *     1 columna, en tablet 2, en escritorio 3 a 4 según la clase.
 *   · La sección usa `container-ac` para que respete los márgenes del layout
 *     sin posicionamiento absoluto.
 *
 * Lo que queda por implementar:
 *   · Ordenamiento (precio, fecha, nombre) — hoy muestra los productos
 *     publicados en orden de creación.
 *   · Paginación o carga infinita — el primer corte usa un arreglo fijo en
 *     el repositorio.
 *
 * Ancho de columna:
 *   La cuadrícula usa `gap-6` y columnas de 1fr. Cada tarjeta ocupa todo el
 *   ancho disponible en su columna, no un tamaño fijo. Esto mantiene la
 *   proporción de imagen (4:5) sin restringir la información.
 */
export function ProductGrid({
  products,
  priority = false,
}: {
  products: readonly Product[];
  priority?: boolean;
}) {
  return (
    <section className="border-t border-line">
      <div className="container-ac py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              priority={priority && index < 2}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}