import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type BadgeVariant = "solid" | "outline" | "bronze";

const variants: Record<BadgeVariant, string> = {
  solid: "bg-ink text-bone",
  outline: "border border-line-strong text-ash",
  /* El bronce se reserva para lo que merece atención: "Última pieza", drop. */
  bronze: "border border-bronze/40 text-bronze",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

/** Etiqueta corta: "NUEVO", "AGOTADO", "ÚLTIMA PIEZA". */
export function Badge({ variant = "solid", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 font-mono text-[0.625rem] leading-none tracking-[0.14em] uppercase",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}