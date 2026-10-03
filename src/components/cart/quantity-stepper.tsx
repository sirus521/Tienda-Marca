"use client";

import { cn } from "@/lib/utils/cn";

/**
 * Control de cantidad
 * ============================================================================
 * Botón de menos, número, botón de más.
 *
 * Es un `<div>` y no un `<input type="number">` a propósito. El input nativo
 * deja escribir cualquier valor, y cada tecla dispara un `onChange` con datos
 * intermedios: al borrar el "2" de "12" la línea se queda en "1", y al teclear
 * "15" alguien podría pasar por "1", "15" y "150". Aquí no hay estado
 * intermedio: solo se suma o se resta.
 *
 * Los números se leen con `tabular-nums` porque la cifra cambia de ancho al
 * cambiar de valor, y eso hace que el resto del renglón baile.
 */
export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label = "Cantidad",
  className,
}: {
  value: number;
  min?: number;
  /** Tope: el stock disponible de la variante. */
  max: number;
  onChange: (next: number) => void;
  label?: string;
  className?: string;
}) {
  /* Cuando no queda stock el control no se oculta: se ve y se explica. Un
     control que desaparece deja un espacio vacío sin explicación. */
  const exhausted = max <= 0;
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <div
      className={cn("inline-flex items-center border border-line", className)}
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDecrease}
        className="flex size-9 items-center justify-center text-ink transition-colors duration-200 hover:bg-bone-2 disabled:cursor-not-allowed disabled:text-ash-2"
      >
        <span className="sr-only">Quitar una unidad</span>
        <span aria-hidden="true" className="block h-px w-3 bg-current" />
      </button>

      <span aria-live="polite" className="w-8 text-center font-mono text-sm text-ink tabular-nums">
        {value}
      </span>

      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        className="flex size-9 items-center justify-center text-ink transition-colors duration-200 hover:bg-bone-2 disabled:cursor-not-allowed disabled:text-ash-2"
      >
        <span className="sr-only">Agregar una unidad</span>
        <span aria-hidden="true" className="relative block size-3">
          <span className="absolute top-1/2 left-0 block h-px w-full bg-current" />
          <span className="absolute top-0 left-1/2 block h-full w-px bg-current" />
        </span>
      </button>

      {exhausted ? (
        <span className="sr-only" role="status">
          Agotado
        </span>
      ) : null}
    </div>
  );
}
