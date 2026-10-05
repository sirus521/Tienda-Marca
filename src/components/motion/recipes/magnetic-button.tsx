"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
   Magnetic
   ===========================================================================
   Micro-interacción de motion-anything: el wrapper se inclina (unos píxeles,
   spring snappy) hacia el puntero al acercarse y rebota al soltarlo. Por
   respeto a la regla SIN GLOW y a esta marca editorial, no toca la paleta
   del botón: el CTA conserva `buttonStyles`. Desactivado con movimiento
   reducido y en táctiles, como trae la receta.
   ------------------------------------------------------------------------- */

export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const touch = window.matchMedia("(hover: none)").matches;
    if (reduced || touch) return;

    const move = (event: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = event.clientX - (r.left + r.width / 2);
      const dy = event.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const leave = () => {
      el.style.transform = "";
    };

    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);

    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [strength]);

  return (
    <span ref={ref} className={cn("magnetic inline-flex", className)}>
      {children}
    </span>
  );
}
