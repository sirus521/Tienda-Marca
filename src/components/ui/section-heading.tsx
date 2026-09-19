import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type SectionHeadingProps = {
  /** Numeración editorial: "01 / 04". Da ritmo y estructura sin adornos. */
  index: string;
  total?: string;
  title: string;
  description?: string;
  /** Acción a la derecha (normalmente un enlace "Ver todo"). */
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/**
 * Encabezado de sección.
 *
 * Estructura consistente en toda la tienda: numeración en monoespaciada arriba,
 * titular en slab serif abajo, y la acción alineada a la derecha en pantallas
 * grandes. La repetición ordenada es lo que hace que el sitio se sienta
 * diseñado y no ensamblado.
 */
export function SectionHeading({
  index,
  total = "04",
  title,
  description,
  action,
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-6 border-t border-line pt-5 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        <span className="eyebrow">
          {index} <span className="text-ash-2">/ {total}</span>
        </span>

        <Tag className="mt-4 text-title">{title}</Tag>

        {description ? <p className="mt-4 max-w-xl text-ash">{description}</p> : null}
      </div>

      {action ? (
        /* En móvil la acción baja y ocupa su propia línea: apretarla junto al
           titular lo parte en dos y se lee mal. */
        <div className="shrink-0">{action}</div>
      ) : null}
    </header>
  );
}
