"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Proveedor de animación con carga diferida.
 *
 * `LazyMotion` + `domAnimation` carga solo el subconjunto necesario
 * (animaciones, variantes, gestos de hover/tap) en vez del bundle completo.
 * Eso ahorra decenas de KB, que importan porque el plan gratuito de
 * Cloudflare Workers limita el script a 3 MiB.
 *
 * Los features se cargan con `import()` dinámico, así que el código de
 * animación no entra en el bundle inicial: la página pinta primero y la
 * animación llega después.
 *
 * IMPORTANTE — modo estricto:
 *   `strict` obliga a usar los componentes `m.*` en lugar de `motion.*`.
 *   Si alguien escribe `motion.div`, el bundle completo se cuela de vuelta
 *   y `strict` lo delata en desarrollo. Es intencional: protege el
 *   presupuesto de bytes.
 *
 * Nota sobre animaciones de layout:
 *   `domAnimation` NO incluye animaciones de layout (`layout`, `layoutId`).
 *   Se decidirá si vale la pena subir a `domMax` cuando se construyan el
 *   carrito y el selector de tallas, midiendo el impacto real.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}