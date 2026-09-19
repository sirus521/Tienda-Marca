import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type AccordionItem = {
  /** Identificador estable para la clave de React y el ancla de la URL. */
  id: string;
  title: string;
  content: ReactNode;
  /** Abierto por defecto. Uno solo debería estarlo: el más importante. */
  defaultOpen?: boolean;
};

type AccordionProps = {
  items: readonly AccordionItem[];
  className?: string;
};

/**
 * Acordeón
 * ============================================================================
 * Construido sobre `<details>`/`<summary>` nativos, sin JavaScript.
 *
 * POR QUÉ NATIVO
 *  1. FUNCIONA SIN JAVASCRIPT. Si el paquete falla, los detalles del producto
 *     siguen abriéndose. Es contenido informativo: no puede depender de nada.
 *  2. VIENE CON LA SEMÁNTICA RESUELTA. El navegador ya expone el estado
 *     expandido/contraído a lectores de pantalla y ya responde a teclado.
 *     Reimplementarlo con `div` y `aria-expanded` es más código y más frágil.
 *  3. CERO JAVASCRIPT EN EL BUNDLE. En una ficha de producto con varios
 *     apartados, eso es peso que no viaja.
 *
 * El marcador nativo (la flecha del navegador) se oculta y en su lugar va un
 * indicador propio: un signo que pasa de `+` a `−` girando 90°. Giro, no glow.
 */
export function Accordion({ items, className }: AccordionProps) {
  return (
    <div className={cn("border-t border-line", className)}>
      {items.map((item) => (
        <details
          key={item.id}
          id={item.id}
          open={item.defaultOpen}
          className="group border-b border-line"
        >
          <summary
            /* `list-none` quita el triángulo nativo. La clase `[&::-webkit-details-marker]`
               cubre Safari, que no respeta `list-style: none` en `summary`. */
            className="flex cursor-pointer items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden"
          >
            <span className="font-mono text-label tracking-[0.16em] uppercase">{item.title}</span>

            {/* Indicador: dos barras de 1px que forman + y giran a − al abrir. */}
            <span
              aria-hidden="true"
              className="relative block size-3.5 shrink-0 transition-transform duration-500 ease-out-expo group-open:rotate-135"
            >
              <span className="absolute top-1/2 left-0 block h-px w-full bg-ink" />
              <span className="absolute top-0 left-1/2 block h-full w-px bg-ink" />
            </span>
          </summary>

          <div className="pb-7 text-sm leading-relaxed text-ash">{item.content}</div>
        </details>
      ))}
    </div>
  );
}