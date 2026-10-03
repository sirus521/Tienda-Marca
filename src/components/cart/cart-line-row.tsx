"use client";

import Image from "next/image";
import Link from "next/link";

import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { describeOptions } from "@/lib/domain/cart";
import { formatMoney } from "@/lib/domain/money";
import { cartStore } from "@/lib/stores/cart-store";
import type { CartLine } from "@/lib/domain/types";

/**
 * Línea del carrito
 * ============================================================================
 * Muestra un artículo, su cantidad y su total, y deja cambiar la cantidad o
 * quitarlo.
 *
 * Los datos de la línea están copiados, no referenciados: nombre, precio e
 * imagen son los que tenía cuando se agregó. Es deliberado (ver `types.ts`).
 * Por eso aquí no se consulta el catálogo.
 *
 * El precio de la derecha es SIEMPRE la cantidad por el precio unitario, no
 * el que se guardó en algún sitio. Es la única cuenta que no puede quedar
 * desactualizada.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const removeLine = cartStore((state) => state.removeLine);
  const setQuantity = cartStore((state) => state.setQuantity);

  const options = describeOptions(line.optionValues);
  const lineTotal = line.unitPriceCents * line.quantity;

  return (
    <li className="flex gap-4 py-5">
      {/* ---------------- Foto ---------------- */}
      <Link
        href={`/producto/${line.productSlug}`}
        className="relative size-20 shrink-0 overflow-hidden bg-bone-2 sm:size-24"
      >
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : null}
      </Link>

      {/* ---------------- Detalle ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={`/producto/${line.productSlug}`}
              className="link-underline font-display text-base leading-tight text-ink"
            >
              {line.productName}
            </Link>

            {options ? <p className="mt-1 text-sm text-ash">{options}</p> : null}
            <p className="mt-0.5 font-mono text-xs text-ash-2">{line.variantSku}</p>
          </div>

          <p className="shrink-0 font-mono text-sm text-ink tabular-nums">
            {formatMoney(lineTotal)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <QuantityStepper
            value={line.quantity}
            max={line.maxStock}
            onChange={(next) => setQuantity(line.variantId, next)}
            label={`Cantidad de ${line.productName}`}
          />

          <button
            type="button"
            onClick={() => removeLine(line.variantId)}
            className="font-mono text-xs tracking-[0.14em] text-ash-2 uppercase underline-offset-4 transition-colors duration-200 hover:text-danger hover:underline"
          >
            Quitar
            <span className="sr-only"> {line.productName} de la bolsa</span>
          </button>
        </div>
      </div>
    </li>
  );
}
