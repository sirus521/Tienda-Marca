"use client";

import { m, useScroll, useSpring } from "motion/react";

/**
 * Barra de progreso de lectura, anclada arriba de la ventana.
 *
 * Detalles:
 *  - `scaleX` en lugar de `width`: anima en la GPU y no provoca reflow.
 *  - `useSpring` suaviza el avance. Sin él, la barra salta con cada rueda
 *    del ratón y se siente nerviosa.
 *  - El color es tinta sólida, no un gradiente brillante: la regla de la
 *    marca es cero glow.
 *  - `aria-hidden` porque es decorativa; un lector de pantalla ya anuncia la
 *    posición del documento.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  return (
    <m.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-50 h-px origin-left bg-ink"
    />
  );
}