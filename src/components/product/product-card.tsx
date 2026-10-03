import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  getPrimaryImage,
  getSecondaryImage,
  getMinPrice,
  hasPriceRange,
  isSoldOut,
  isLowStock,
} from "@/lib/domain/catalog";
import { formatMoney, percentOff } from "@/lib/domain/money";
import type { Product } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

type ProductCardProps = {
  product: Product;
  /** Prioriza la carga de la imagen. Solo para las tarjetas visibles arriba. */
  priority?: boolean;
  /** Índice para el escalonado de la animación de entrada. */
  index?: number;
  className?: string;
};

/**
 * Tarjeta de producto.
 *
 * EL HOVER NO ES UN EFECTO DECORATIVO. Es la segunda imagen del producto:
 * vender ropa sin mostrar más de un ángulo pierde ventas. Al pasar el cursor,
 * la imagen secundaria aparece con un fundido mientras la principal se
 * desvanece. Es un intercambio de imágenes, no un destello.
 *
 * Por qué CSS y no Motion aquí:
 *   Es un cambio de `opacity` con `group-hover`, y eso corre en la GPU sin
 *   JavaScript. Reservamos Motion para lo que depende del scroll o del estado
 *   de React. Menos JavaScript en el hilo principal es scroll más fluido.
 *
 * Precios:
 *   · Un solo precio → "$549"
 *   · Varios precios → "desde $649" (evita mostrar un precio que no aplica
 *     a la variante que el cliente va a elegir)
 *   · Con promoción → el "antes" tachado y el porcentaje de ahorro
 */
export function ProductCard({ product, priority = false, index = 0, className }: ProductCardProps) {
  const primary = getPrimaryImage(product);
  const secondary = getSecondaryImage(product);
  const minPrice = getMinPrice(product);
  const ranged = hasPriceRange(product);
  const soldOut = isSoldOut(product);
  const lowStock = isLowStock(product);

  /* El porcentaje de ahorro solo es honesto si aplica a la variante más
     económica: por eso se calcula sobre ella y no sobre un promedio. */
  const cheapestVariant = product.variants.reduce<null | (typeof product.variants)[number]>(
    (best, variant) => (!best || variant.priceCents < best.priceCents ? variant : best),
    null,
  );
  const discount = cheapestVariant
    ? percentOff(cheapestVariant.priceCents, cheapestVariant.compareAtPriceCents)
    : null;

  return (
    <article className={cn("group relative", className)}>
      <Link href={`/producto/${product.slug}`} className="block">
        {/* ---------------- Imagen ---------------- */}
        <div className="relative aspect-4/5 w-full overflow-hidden bg-bone-2">
          {primary ? (
            <Image
              src={primary.url}
              alt={primary.alt}
              fill
              /* Con `fill` el contenedor manda: define el tamaño y evita el
                 salto de layout cuando la imagen termina de cargar. */
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              /* Las primeras tarjetas se cargan de inmediato; el resto, cuando
                 se acercan al viewport. Ahorra ancho de banda en móvil. */
              loading={priority ? undefined : "lazy"}
              className={cn(
                "object-cover transition-[opacity,transform] duration-700 ease-out-expo",
                "group-hover:scale-[1.03]",
                secondary && "group-hover:opacity-0",
              )}
            />
          ) : null}

          {secondary ? (
            <Image
              src={secondary.url}
              alt={secondary.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              loading="lazy"
              aria-hidden="true"
              className="object-cover opacity-0 transition-opacity duration-700 ease-out-expo group-hover:opacity-100"
            />
          ) : null}

          {/* ---------------- Etiquetas ---------------- */}
          <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-2">
            {soldOut ? <Badge variant="solid">Agotado</Badge> : null}
            {!soldOut && lowStock ? <Badge variant="bronze">Últimas piezas</Badge> : null}
            {discount ? <Badge variant="outline">−{discount}%</Badge> : null}
          </div>
        </div>

        {/* ---------------- Información ---------------- */}
        <div className="flex items-start justify-between gap-4 pt-4">
          <div className="min-w-0">
            <h3 className="text-base leading-snug font-medium">
              <span className="link-underline">{product.name}</span>
            </h3>
            <p className="mt-1 truncate text-sm text-ash">{product.shortDescription}</p>
          </div>

          <div className="shrink-0 text-right">
            {ranged ? <span className="block eyebrow">desde</span> : null}
            <span className="block font-mono text-sm tabular-nums">{formatMoney(minPrice)}</span>
            {cheapestVariant?.compareAtPriceCents && discount ? (
              <span className="block font-mono text-xs text-ash-2 tabular-nums line-through">
                {formatMoney(cheapestVariant.compareAtPriceCents)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {/* Índice de la tarjeta, en mono. Da ritmo editorial al grid. */}
      <span className="pointer-events-none absolute -top-5 left-0 hidden eyebrow opacity-0 transition-opacity duration-500 group-hover:opacity-100 lg:block">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}
