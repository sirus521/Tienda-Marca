"use client";

import Image from "next/image";

import type { ProductImage } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

type ProductGalleryProps = {
  images: readonly ProductImage[];
  /** Imagen visible. La controla el padre para poder seguir a la variante. */
  activeImageId: string | null;
  onSelect: (imageId: string) => void;
  /** Nombre del producto, para el texto alternativo de reserva. */
  productName: string;
};

/**
 * Galería de producto
 * ============================================================================
 * DECISIÓN: todas las imágenes se montan a la vez y el cambio se hace con
 * `opacity`. No se usa un carrusel que monta y desmonta.
 *
 * Por qué:
 *  1. CAMBIO INSTANTÁNEO. Al elegir un color, la imagen ya está descargada y
 *     el cambio es inmediato. Con montaje dinámico hay un hueco en blanco
 *     mientras el navegador trae el archivo.
 *  2. SIN SALTO DE LAYOUT. El contenedor tiene proporción fija y las imágenes
 *     se superponen con `absolute`; nada se reacomoda al cambiar.
 *  3. EL HTML LLEVA TODAS LAS FOTOS. Los buscadores y las previsualizaciones
 *     de enlaces ven el catálogo completo del producto, no solo la portada.
 *
 * El costo es que se descargan todas las imágenes del producto. Es aceptable
 * porque una ficha tiene pocas (3–5) y todas son relevantes para la decisión de
 * compra. `loading="lazy"` evita que compitan con el resto de la página.
 *
 * MINIATURAS
 * En móvil van en fila con scroll horizontal; en escritorio, en columna a la
 * izquierda. Se resuelve con utilidades de Tailwind y no con dos componentes
 * distintos: duplicar el markup sería duplicar el mantenimiento.
 */
export function ProductGallery({
  images,
  activeImageId,
  onSelect,
  productName,
}: ProductGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="relative aspect-4/5 w-full bg-bone-2" aria-hidden="true" />
    );
  }

  const ordered = images.slice().sort((a, b) => a.position - b.position);
  const active = ordered.find((image) => image.id === activeImageId) ?? ordered[0];

  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse lg:items-start">
      {/* ---------------- Imagen principal ---------------- */}
      <div className="relative aspect-4/5 w-full overflow-hidden bg-bone-2 lg:flex-1">
        {ordered.map((image) => (
          <Image
            key={image.id}
            src={image.url}
            alt={image.alt || productName}
            fill
            sizes="(max-width: 1024px) 100vw, 55vw"
            /* La primera se carga con prioridad: es el elemento visible al
               entrar en la ficha y suele ser el LCP de la página. */
            priority={image.id === ordered[0]?.id}
            loading={image.id === ordered[0]?.id ? undefined : "lazy"}
            className={cn(
              "object-cover transition-opacity duration-500 ease-out-expo",
              image.id === active?.id ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>

      {/* ---------------- Miniaturas ---------------- */}
      {ordered.length > 1 ? (
        <ul
          className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          /* La lista es una elección de imagen: sin esto un lector de pantalla
             la anunciaría como una tabla o una lista genérica de contenido. */
          aria-label="Imágenes del producto"
        >
          {ordered.map((image, index) => {
            const isActive = image.id === active?.id;

            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(image.id)}
                  aria-label={`Ver imagen ${index + 1} de ${ordered.length}`}
                  aria-current={isActive}
                  /* Anillo interior en vez de `outline`: no se sale del marco y
                     mantiene la retícula alineada. */
                  className={cn(
                    "relative block size-16 overflow-hidden bg-bone-2 transition-[box-shadow] duration-300 lg:size-20",
                    isActive
                      ? "shadow-[inset_0_0_0_1px_var(--color-ink)]"
                      : "shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:shadow-[inset_0_0_0_1px_var(--color-ink)]",
                  )}
                >
                  <Image
                    src={image.url}
                    alt=""
                    fill
                    sizes="80px"
                    loading="lazy"
                    /* `aria-hidden` porque la miniatura ya está descrita por el
                       botón que la contiene: repetir el alt sería ruido. */
                    aria-hidden="true"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}