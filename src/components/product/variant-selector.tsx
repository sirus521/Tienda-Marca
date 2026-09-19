"use client";

import { isOptionValueAvailable } from "@/lib/domain/catalog";
import type { Product } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

type VariantSelectorProps = {
  product: Product;
  /** Selección actual: `{ Talla: "L", Color: "Negro Hueso" }`. */
  selection: Record<string, string>;
  onChange: (optionName: string, value: string) => void;
  className?: string;
};

/**
 * Selector de variantes
 * ============================================================================
 * Dos formas de presentación, elegidas por el TIPO de eje y no por una lista
 * codificada a mano:
 *
 *  · Eje con valores de color (`hexColor`) → muestras de color reales.
 *  · Cualquier otro eje (talla, corte, tela) → fichas de texto.
 *
 * Así, el día que se agregue "Tela" o "Corte" desde el panel, la interfaz ya
 * sabe cómo mostrarlos sin tocar este archivo.
 *
 * LO IMPORTANTE: LO QUE NO SE PUEDE COMPRAR SE VE Y SE DESACTIVA
 * Los valores sin stock en la combinación actual se muestran tachados y
 * deshabilitados en lugar de ocultarse. Ocultarlos haría que la cuadrícula de
 * tallas cambiara de tamaño al cambiar de color, y el cliente no sabría que esa
 * talla existe pero está agotada. Un botón deshabilitado informa; un botón
 * ausente confunde.
 *
 * Sobre el color: la muestra usa el hexadecimal guardado, pero el NOMBRE va
 * siempre presente. Hay personas que no distinguen bien los colores y personas
 * que usan lector de pantalla: el texto no es decorativo, es el dato.
 */
export function VariantSelector({
  product,
  selection,
  onChange,
  className,
}: VariantSelectorProps) {
  const options = product.options.slice().sort((a, b) => a.position - b.position);

  if (options.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-7", className)}>
      {options.map((option) => {
        const values = option.values.slice().sort((a, b) => a.position - b.position);
        const isColorAxis = values.some((value) => value.hexColor !== null);
        const selectedValue = selection[option.name];

        return (
          <fieldset key={option.id}>
            {/* `legend` y no un `span`: agrupa los botones para lectores de
                pantalla, que anuncian "Talla, L, seleccionado" en lugar de
                solo "L, seleccionado". */}
            <legend className="eyebrow flex w-full items-baseline justify-between gap-3">
              <span>{option.name}</span>
              <span className="text-ink normal-case">{selectedValue ?? "—"}</span>
            </legend>

            <div className={cn("mt-3 flex flex-wrap", isColorAxis ? "gap-3" : "gap-2")}>
              {values.map((value) => {
                const isSelected = selectedValue === value.value;
                const isAvailable = isOptionValueAvailable(
                  product,
                  option.name,
                  value.value,
                  selection,
                );

                return isColorAxis ? (
                  <ColorSwatch
                    key={value.id}
                    value={value.value}
                    hexColor={value.hexColor}
                    isSelected={isSelected}
                    isAvailable={isAvailable}
                    onSelect={() => onChange(option.name, value.value)}
                  />
                ) : (
                  <button
                    key={value.id}
                    type="button"
                    onClick={() => onChange(option.name, value.value)}
                    disabled={!isAvailable}
                    aria-pressed={isSelected}
                    aria-label={`${value.value}${isAvailable ? "" : " — agotado"}`}
                    className={cn(
                      "inline-flex h-11 min-w-12 items-center justify-center rounded-xs px-3",
                      "font-mono text-xs tracking-[0.12em] uppercase",
                      "transition-[background-color,color,border-color] duration-300 ease-out-expo",
                      "disabled:cursor-not-allowed",
                      isSelected
                        ? "bg-ink text-bone"
                        : "border border-line-strong text-ink hover:border-ink",
                      !isAvailable &&
                        !isSelected &&
                        "text-ash-2 line-through hover:border-line-strong",
                      !isAvailable && "opacity-60",
                    )}
                  >
                    {value.value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/**
 * Muestra de color.
 *
 * El estado "elegido" se marca con un anillo INTERIOR (`inset`), no con un
 * borde exterior. La razón es de alineación: un borde añadido cambiaría el
 * tamaño de la caja y la fila de muestras daría un salto al seleccionar.
 * El "agotado" se marca con una barra diagonal y opacidad reducida.
 */
function ColorSwatch({
  value,
  hexColor,
  isSelected,
  isAvailable,
  onSelect,
}: {
  value: string;
  hexColor: string | null;
  isSelected: boolean;
  isAvailable: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      /* El nombre accesible incluye el estado: sin esto, el lector de pantalla
         lee "Negro Hueso" y no si está agotado o elegido. */
      aria-label={`${value}${isAvailable ? "" : " — agotado"}`}
      title={isAvailable ? value : `${value} — agotado`}
      className={cn(
        "relative size-9 rounded-xs transition-transform duration-300 ease-out-expo",
        "disabled:cursor-not-allowed",
        isSelected
          ? "shadow-[inset_0_0_0_2px_var(--color-ink)]"
          : "shadow-[inset_0_0_0_1px_var(--color-line-strong)] hover:-translate-y-0.5",
        !isAvailable && "opacity-35",
      )}
      style={{ backgroundColor: hexColor ?? undefined }}
    >
      {!isAvailable ? (
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-px w-full -rotate-24 bg-ink"
        />
      ) : null}
    </button>
  );
}