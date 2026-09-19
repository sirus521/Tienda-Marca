import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Filtros del listado
 * ============================================================================
 * DECISIÓN: los filtros son ENLACES, no botones con estado de React.
 *
 * Por qué esto es mejor que lo obvio:
 *  1. FUNCIONAN SIN JAVASCRIPT. Son `<a href>`. Nada puede fallar.
 *  2. LA URL ES COMPARTIBLE. "Mándame el link de talla L en negro" es una
 *     conversación real en una tienda por WhatsApp. Con estado local, esa URL
 *     no existe.
 *  3. EL BOTÓN "ATRÁS" FUNCIONA. Con filtros en estado, atrás sale de la
 *     página en lugar de quitar el filtro, y el usuario pierde su lugar.
 *  4. CERO JAVASCRIPT EN EL BUNDLE. Cero estado, cero sincronización entre la
 *     URL y la interfaz.
 *
 * El estado activo se marca con relleno de tinta y `aria-current="true"`, que
 * es la forma correcta de decir "este es el filtro vigente" a un lector de
 * pantalla.
 */

export type FilterState = {
  talla?: string;
  etiqueta?: string;
  orden?: string;
};

/** Construye la URL de un filtro partiendo del estado actual. */
function buildHref(patch: FilterState): string {
  const params = new URLSearchParams();

  /* Se pasa el estado ya fusionado. Un valor `undefined` elimina la clave: así
     "Todas" quita la talla sin perder el orden elegido. */
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `/tienda?${query}` : "/tienda";
}

type ProductFiltersProps = {
  /** Valores vigentes, leídos de la URL. */
  current: FilterState;
  availableSizes: readonly string[];
  availableTags: readonly string[];
  /** Total de resultados con los filtros aplicados. */
  resultCount: number;
};

const SORT_OPTIONS = [
  { value: "recientes", label: "Recientes" },
  { value: "precio-asc", label: "Precio ↑" },
  { value: "precio-desc", label: "Precio ↓" },
] as const;

export function ProductFilters({
  current,
  availableSizes,
  availableTags,
  resultCount,
}: ProductFiltersProps) {
  /* Con un solo valor no hay nada que filtrar: mostrarlo sería ruido. */
  const hasFilters = Boolean(current.talla || current.etiqueta);

  return (
    <div className="border-y border-line">
      <div className="container-ac flex flex-col gap-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        {/* ---------------- Talla ---------------- */}
        {availableSizes.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Talla</span>

            <FilterChip href={buildHref({ orden: current.orden })} active={!current.talla}>
              Todas
            </FilterChip>

            {availableSizes.map((size) => (
              <FilterChip
                key={size}
                href={buildHref({ ...current, talla: size })}
                active={current.talla === size}
              >
                {size}
              </FilterChip>
            ))}
          </div>
        ) : null}

        {/* ---------------- Etiquetas y orden ---------------- */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {availableTags.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="eyebrow mr-1">Etiqueta</span>

              <FilterChip
                href={buildHref({ talla: current.talla, orden: current.orden })}
                active={!current.etiqueta}
              >
                Todas
              </FilterChip>

              {availableTags.map((tag) => (
                <FilterChip
                  key={tag}
                  href={buildHref({ ...current, etiqueta: tag })}
                  active={current.etiqueta === tag}
                >
                  {tag}
                </FilterChip>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Orden</span>
            {SORT_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                href={buildHref({
                  talla: current.talla,
                  etiqueta: current.etiqueta,
                  /* El orden por defecto se omite de la URL: una URL limpia es
                     mejor que una con `?orden=recientes` de más. */
                  orden: option.value === "recientes" ? undefined : option.value,
                })}
                active={(current.orden ?? "recientes") === option.value}
              >
                {option.label}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Línea de estado y salida rápida cuando hay filtros activos. */}
      <div className="container-ac flex items-center justify-between gap-4 pb-4">
        <p className="font-mono text-xs text-ash" role="status">
          {resultCount} {resultCount === 1 ? "pieza" : "piezas"}
          {hasFilters ? " con estos filtros" : " en la tienda"}
        </p>

        {hasFilters ? (
          <Link
            href={buildHref({ orden: current.orden })}
            className="link-underline font-mono text-xs tracking-[0.14em] text-ink uppercase"
          >
            Quitar filtros
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Ficha de filtro: un enlace con aspecto de botón. */
function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      /* `aria-current` y no una clase: describe el estado a quien no ve el
         relleno. */
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-9 items-center rounded-xs px-3",
        "font-mono text-xs tracking-[0.12em] uppercase",
        "transition-colors duration-300 ease-out-expo",
        active
          ? "bg-ink text-bone"
          : "border border-line-strong text-ash hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}