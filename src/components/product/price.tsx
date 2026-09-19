import { Badge } from "@/components/ui/badge";
import { formatMoney, percentOff } from "@/lib/domain/money";
import { cn } from "@/lib/utils/cn";

type PriceProps = {
  /** Precio vigente, en centavos. */
  priceCents: number;
  /** Precio anterior, para tacharlo. `null` si no hay promoción. */
  compareAtPriceCents?: number | null;
  size?: "md" | "lg";
  /** Muestra el descuento como etiqueta. Solo tiene sentido en la ficha. */
  showDiscount?: boolean;
  className?: string;
};

/**
 * Precio
 * ============================================================================
 * Un solo lugar decide cómo se ve un precio en toda la tienda. Si cada vista
 * formateara por su cuenta, acabarían apareciendo "$549", "549 MXN" y "$549.00"
 * en pantallas distintas.
 *
 * ORDEN DE LECTURA DEL DESCUENTO
 * Primero el precio vigente (grande), luego el anterior tachado y al final la
 * etiqueta con el porcentaje. En ese orden el ojo ya sabe cuánto paga antes de
 * procesar el contexto. Invertirlo obliga a hacer cuentas mentales.
 *
 * El porcentaje se calcula con `percentOff`, que devuelve `null` cuando el
 * precio anterior no es realmente mayor. Sin esa guarda, un precio anterior mal
 * capturado en el panel mostraría "-0%" o incluso un descuento negativo.
 */
export function Price({
  priceCents,
  compareAtPriceCents = null,
  size = "md",
  showDiscount = false,
  className,
}: PriceProps) {
  const discount = percentOff(priceCents, compareAtPriceCents);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1", className)}>
      <span
        className={cn(
          "font-mono tabular-nums",
          size === "lg" ? "text-2xl" : "text-base",
        )}
      >
        {formatMoney(priceCents)}
      </span>

      {discount ? (
        <>
          <span className="font-mono text-sm text-ash-2 line-through tabular-nums">
            {formatMoney(compareAtPriceCents as number)}
          </span>
          {showDiscount ? <Badge variant="outline">−{discount}%</Badge> : null}
        </>
      ) : null}
    </div>
  );
}