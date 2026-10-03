"use client";

import { m, useReducedMotion } from "motion/react";
import type { ElementType, ReactNode } from "react";

import { adminCardVariants, easeOutExpo } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type GlassPanelProps = {
  children: ReactNode;
  /** Etiqueta HTML del envolvente animado. Por defecto `div`. */
  as?: ElementType;
  /** Retraso de entrada, en segundos. */
  delay?: number;
  /** Activar la respuesta de hover. El encabezado la apaga. */
  hover?: boolean;
  /** Clases del envolvente que se mueve. */
  className?: string;
  /** Clases del panel de vidrio. */
  glassClassName?: string;
};

/**
 * Panel de vidrio del panel AC.
 *
 * El movimiento vive en el envolvente y el `backdrop-filter` en el
 * hijo: un `transform` sobre el mismo nodo crearía un contexto de
 * apilamiento nuevo y el vidrio dejaría de tomar lo que hay detrás.
 *
 * Con movimiento reducido se pinta el vidrio sin transformación.
 */
export function GlassPanel({
  children,
  as: Tag = "div",
  delay = 0,
  hover = true,
  className,
  glassClassName,
}: GlassPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const Component = m[Tag as keyof typeof m] as typeof m.div;

  return (
    <Component
      className={cn("will-change-transform", className)}
      variants={adminCardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      transition={{ delay }}
      whileHover={
        hover && !prefersReducedMotion
          ? { y: -4, scale: 1.008, transition: { duration: 0.35, ease: easeOutExpo } }
          : undefined
      }
      whileTap={
        hover && !prefersReducedMotion
          ? { scale: 0.996, transition: { duration: 0.15, ease: easeOutExpo } }
          : undefined
      }
    >
      <div className={cn("glass-ac glass-ac-sheen", glassClassName)}>
        <div className="glass-ac-content">{children}</div>
      </div>
    </Component>
  );
}
