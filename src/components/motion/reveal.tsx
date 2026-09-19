"use client";

import { m, useInView, useReducedMotion } from "motion/react";
import { useRef, type ElementType, type ReactNode } from "react";

import { revealVariants, REVEAL_DISTANCE } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type RevealProps = {
  children: ReactNode;
  /** Etiqueta HTML a renderizar. Por defecto `div`. */
  as?: ElementType;
  /** Retraso en segundos. Útil para secuencias manuales. */
  delay?: number;
  /** Distancia de desplazamiento en píxeles. */
  distance?: number;
  className?: string;
};

/**
 * Revela su contenido cuando entra en el viewport.
 *
 * Decisiones:
 *  - `once: true` → la animación ocurre una sola vez. Repetirla cada vez que
 *    el elemento vuelve a entrar se siente inquieto y distrae de la compra.
 *  - `amount: 0.15` → se dispara cuando el 15% del elemento es visible, no
 *    cuando asoma el primer píxel. Así la animación se ve completa.
 *  - Con movimiento reducido se renderiza visible y sin transición, en lugar
 *    de saltarse el contenido.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  distance = REVEAL_DISTANCE,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.15 });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  const Component = m[Tag as keyof typeof m] as typeof m.div;

  return (
    <Component
      ref={ref}
      className={cn(className)}
      variants={revealVariants(distance)}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      transition={{ delay }}
    >
      {children}
    </Component>
  );
}