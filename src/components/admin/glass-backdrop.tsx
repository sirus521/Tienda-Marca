"use client";

import { m, useReducedMotion } from "motion/react";

import { adminDriftVariants, adminWatermarkVariants } from "@/lib/motion/tokens";

/**
 * Fondo del panel: rejilla de papel, dos formas suaves y el agua
 * del monograma.
 *
 * Todo es opaco muy bajo y `blur-3xl`, nunca glow. El vidrio toma
 * esta capa detrás; sin ella, `backdrop-filter` solo difuminaría un
 * fondo plano. Con movimiento reducido queda la rejilla estática.
 */
export function AdminGlassBackdrop() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade opacity-70" />

      {!prefersReducedMotion ? (
        <>
          <m.div
            className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-ink/[0.035] blur-3xl"
            variants={adminDriftVariants}
            initial="initial"
            animate="animate"
          />
          <m.div
            className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-bronze/[0.05] blur-3xl"
            variants={adminDriftVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 24 }}
          />
          <m.span
            className="absolute top-8 -right-12 font-display text-[18rem] leading-none text-ink/[0.025] select-none"
            variants={adminWatermarkVariants}
            initial="initial"
            animate="animate"
          >
            AC
          </m.span>
        </>
      ) : null}
    </div>
  );
}
