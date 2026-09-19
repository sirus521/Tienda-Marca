import { cn } from "@/lib/utils/cn";

type LogoMarkProps = {
  className?: string;
  /** Texto alternativo accesible. Vacío = decorativo (hay texto al lado). */
  title?: string;
};

/**
 * Monograma AC — trazo vectorial
 * ============================================================================
 * Reproduce el lockup del logo de la marca: `A` con remates de losa (slab) y
 * `C` cuadrada, ambas en bloque, como en una tipografía atlética colegial.
 *
 * Por qué es SVG dibujado y no texto con una fuente:
 *   · Cero dependencia de fuentes → el mismo trazo exacto en el header, en el
 *     footer y en el favicon.
 *   · Nítido a cualquier tamaño, sin saltos de carga ni layout shift.
 *   · El color se hereda con `currentColor`, así que funciona sobre papel o
 *     sobre tinta sin duplicar variantes.
 *
 * Geometría: lienzo de 64×64 con las letras centradas ópticamente. El `C` se
 * traza con un solo `path` y `stroke-linejoin: miter` para que las esquinas
 * queden duras — coherente con las esquinas de 2px del resto de la interfaz.
 *
 * TODO(usuario): si llega el archivo final del logo (PNG/SVG), se reemplaza
 * esta implementación y ningún componente que la use necesita cambios.
 */
export function LogoMark({ className, title }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("block h-auto w-full", className)}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {/* ---------- A ---------- */}
      <g stroke="currentColor" strokeWidth="6.5">
        <path d="M22 17.5 11 48" />
        <path d="M22 17.5 33 48" />
      </g>
      {/* Remate superior del vértice */}
      <rect x="17" y="14" width="10" height="5.5" fill="currentColor" />
      {/* Pies (remates de losa) */}
      <rect x="6.5" y="47.5" width="9.5" height="4.5" fill="currentColor" />
      <rect x="28.5" y="47.5" width="9.5" height="4.5" fill="currentColor" />
      {/* Travesaño */}
      <rect x="13" y="38" width="18" height="5" fill="currentColor" />

      {/* ---------- C ---------- */}
      <path
        d="M56 21H45.5V47H56"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* Remates de losa de la C */}
      <rect x="53.5" y="17.75" width="4" height="6.5" fill="currentColor" />
      <rect x="53.5" y="43.75" width="4" height="6.5" fill="currentColor" />
    </svg>
  );
}