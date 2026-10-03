"use client";

import { m, useReducedMotion } from "motion/react";

import { AnimatedNumber } from "@/components/admin/animated-number";
import { GlassPanel } from "@/components/admin/glass-panel";
import { adminAccentVariants } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils/cn";

type AdminStatCardProps = {
  label: string;
  value: number;
  detail: string;
  /** Retraso de entrada, para la secuencia de la cuadrícula. */
  delay?: number;
  /** Acento de la línea superior: tinta o bronce. */
  accent?: "ink" | "bronze";
  className?: string;
};

/**
 * Tarjeta de métrica del panel.
 *
 * Tres movimientos independientes: la tarjeta se revela, el número
 * sube con resorte y la línea de acento respira. Nada rebota; el
 * sistema AC usa easing de precisión.
 */
export function AdminStatCard({
  label,
  value,
  detail,
  delay = 0,
  accent = "ink",
  className,
}: AdminStatCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <GlassPanel delay={delay} className={cn("h-full", className)} glassClassName="h-full p-5">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">{label}</p>
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", accent === "bronze" ? "bg-bronze" : "bg-ink")}
        />
      </div>

      <p className="mt-4 font-display text-heading text-ink">
        <AnimatedNumber value={value} />
      </p>

      <p className="mt-2 text-sm text-ash">{detail}</p>

      {prefersReducedMotion ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 block h-px",
            accent === "bronze" ? "bg-bronze/60" : "bg-ink/60",
          )}
        />
      ) : (
        <m.span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 block h-px origin-left",
            accent === "bronze" ? "bg-bronze/60" : "bg-ink/60",
          )}
          variants={adminAccentVariants}
          initial="initial"
          animate="animate"
        />
      )}
    </GlassPanel>
  );
}
