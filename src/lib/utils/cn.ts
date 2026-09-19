import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales (`clsx`) y resuelve conflictos de Tailwind
 * (`tailwind-merge`).
 *
 * Sin esto, `cn("px-4", props.className)` con `className="px-8"` genera
 * ambas clases y el resultado depende del orden del CSS, no del orden de
 * escritura. `twMerge` garantiza que la última clase gane, que es lo que
 * cualquier persona espera al pasar una prop `className`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}