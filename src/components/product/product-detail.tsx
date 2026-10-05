"use client";

import type { Product } from "@/lib/domain/types";

import Link from "next/link";
import { useState } from "react";

import { GlassCard } from "@/components/glass/glass-card";
import { Magnetic } from "@/components/motion/recipes/magnetic-button";
import { Price } from "@/components/product/price";
import { ProductGallery } from "@/components/product/product-gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { buildCartLine } from "@/lib/domain/cart";
import {
  getDefaultVariant,
  getPrimaryImage,
  getVariantImage,
  resolveVariantSelection,
  variantToSelection,
} from "@/lib/domain/catalog";
import { cartStore } from "@/lib/stores/cart-store";
import { cn } from "@/lib/utils/cn";

/**
 * Detalle de producto (interactivo)
 * ============================================================================
 * POR QUÉ ESTE BLOQUE ES DE CLIENTE Y EL RESTO DE LA FICHA NO
 * El límite se puso en el punto exacto donde empieza el estado: elegir talla,
 * elegir color, elegir cantidad. Ese estado vive aquí. Todo lo demás —las
 * descripciones, la tabla de medidas, los cuidados y los relacionados— es
 * estático y se queda en el servidor, así que no viaja JavaScript por él.
 *
 * EL PROBLEMA REAL QUE RESUELVE `resolveVariantSelection`
 * El cliente no elige en orden fijo. Puede tener "Talla M / Negro" y tocar
 * "Arena", que no existe en M. Si la selección se quedara rota, el botón de
 * compra moriría sin explicar por qué. La función reajusta la selección a una
 * combinación que sí existe, y los selectores se acomodan solos.
 *
 * SINCRONIZACIÓN IMAGEN ↔ VARIANTE
 * `imageOverride` guarda la imagen que el usuario eligió a mano. Mientras sea
 * `null`, manda la imagen de la variante. Al cambiar de variante se limpia el
 * override, así que la galería sigue el color elegido. Es preferible a un
 * efecto que "empuje" la imagen: aquí no hay estado derivado ni render extra.
 */
export function ProductDetail({ product }: { product: Product }) {
  const initialVariant = getDefaultVariant(product);

  const [selection, setSelection] = useState<Record<string, string>>(() =>
    initialVariant ? variantToSelection(initialVariant) : {},
  );
  const [imageOverride, setImageOverride] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { variant } = resolveVariantSelection(product, selection);

  /* Imagen visible: la elegida a mano o, si no, la de la variante activa. */
  const activeImage = getVariantImage(product, variant) ?? getPrimaryImage(product);
  const activeImageId = imageOverride ?? activeImage?.id ?? null;

  const stock = variant?.stock ?? 0;
  const soldOut = !variant || stock <= 0;
  const maxQuantity = Math.max(1, Math.min(stock, 10));

  function handleVariantChange(optionName: string, value: string) {
    const resolved = resolveVariantSelection(product, {
      ...selection,
      [optionName]: value,
    });

    setSelection(resolved.selection);
    /* Se suelta la elección manual para que la galería siga al color nuevo. */
    setImageOverride(null);
    /* La cantidad vuelve a 1: si estaba en 3 y la talla nueva tiene menos
       stock, arrastrar la cantidad anterior sería un error silencioso. */
    setQuantity(1);
    setFeedback(null);
  }

  function handleAddToCart() {
    if (!variant) return;

    cartStore.getState().addLine(buildCartLine(product, variant), quantity);
    cartStore.getState().open();
    setFeedback(quantity > 1 ? `${quantity} piezas añadidas a la bolsa.` : "Añadido a la bolsa.");
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
      {/* ---------------- Galería ---------------- */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery
          images={product.images}
          activeImageId={activeImageId}
          onSelect={setImageOverride}
          productName={product.name}
        />
      </div>

      {/* ---------------- Panel de compra ---------------- */}
      <div className="lg:pt-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="eyebrow">{product.category}</span>
          {soldOut ? <Badge variant="solid">Agotado</Badge> : null}
        </div>

        <h1 className="mt-4 text-title">{product.name}</h1>

        <p className="mt-4 max-w-md text-lead text-ash">{product.shortDescription}</p>

        {/* ---------------- Zona de compra sobre vidrio ----------------
            La identidad (categoría, nombre, descripción) va directa
            sobre papel; los controles que llevan a la compra descansan
            sobre vidrio. La animación de entrada es CSS (cero JS) en
            el envolvente, y el `backdrop-filter` en la tarjeta. */}
        <div className="mt-8 animate-fade-up [animation-delay:150ms]">
          <GlassCard contentClassName="p-6 lg:p-7">
            <Price
              size="lg"
              showDiscount
              priceCents={variant?.priceCents ?? 0}
              compareAtPriceCents={variant?.compareAtPriceCents ?? null}
            />

            <VariantSelector
              className="mt-9"
              product={product}
              selection={selection}
              onChange={handleVariantChange}
            />

            {/* ---------------- Cantidad y compra ---------------- */}
            <div className="mt-9 flex flex-wrap items-stretch gap-3">
              <QuantityStepper
                value={quantity}
                max={maxQuantity}
                disabled={soldOut}
                onChange={(next) => {
                  setQuantity(next);
                  setFeedback(null);
                }}
              />

              <Magnetic className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={soldOut}
                  className={cn(buttonStyles({ variant: "primary", size: "lg" }), "w-full")}
                >
                  {soldOut ? "Sin existencias" : "Añadir a la bolsa"}
                </button>
              </Magnetic>
            </div>

            {/* ---------------- Estado del stock ---------------- */}
            <div className="mt-5 min-h-5" role="status" aria-live="polite">
              {feedback ? (
                <p className="font-mono text-xs tracking-[0.14em] uppercase">
                  {feedback}{" "}
                  <Link href="/carrito" className="link-underline text-ink">
                    Ver la bolsa
                  </Link>
                </p>
              ) : null}

              {!feedback && !soldOut && stock <= 5 ? (
                /* Escasez real, con el número exacto. Un "¡últimas piezas!"
                   genérico se lee como táctica de venta y pierde efecto; una
                   cantidad concreta se lee como información. */
                <p className="font-mono text-xs tracking-[0.14em] text-ash uppercase">
                  Quedan {stock} {stock === 1 ? "pieza" : "piezas"} en esta talla
                </p>
              ) : null}

              {!feedback && soldOut ? (
                <p className="font-mono text-xs tracking-[0.14em] text-ash uppercase">
                  Esta combinación está agotada — elige otra talla o color
                </p>
              ) : null}
            </div>

            {/* Si la variante elegida sí se puede comprar pero alguna otra
                opción del producto no, conviene avisarlo: evita que el
                cliente descubra al final que su talla no existe. */}
            {!soldOut && variant?.sku ? (
              <p className="mt-5 border-t border-line pt-4 font-mono text-xs text-ash-2">
                SKU {variant.sku}
              </p>
            ) : null}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/**
 * Selector de cantidad.
 *
 * Detalles que lo hacen usable:
 *  · Los botones tienen 44 px de alto, el mínimo táctil recomendado.
 *  · `−` se deshabilita en 1 y `+` en el máximo: mejor un botón apagado que un
 *    clic que no hace nada.
 *  · El número es un `<output>`: el lector de pantalla lo anuncia al cambiar.
 *  · `tabular-nums` evita que el ancho del número cambie al pasar de 9 a 10 y
 *    el control "baile".
 */
function QuantityStepper({
  value,
  max,
  disabled,
  onChange,
}: {
  value: number;
  max: number;
  disabled: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex h-14 items-stretch border border-line-strong">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= 1}
        aria-label="Quitar una pieza"
        className="w-12 transition-colors duration-300 hover:bg-bone-2 disabled:opacity-35 disabled:hover:bg-transparent"
      >
        <span aria-hidden="true" className="mx-auto block h-px w-3 bg-ink" />
      </button>

      <output
        aria-label="Cantidad"
        className="flex w-10 items-center justify-center font-mono text-sm tabular-nums"
      >
        {value}
      </output>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Añadir una pieza"
        className="relative w-12 transition-colors duration-300 hover:bg-bone-2 disabled:opacity-35 disabled:hover:bg-transparent"
      >
        <span aria-hidden="true" className="mx-auto block h-px w-3 bg-ink" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 block h-3 w-px -translate-1/2 bg-ink"
        />
      </button>
    </div>
  );
}
