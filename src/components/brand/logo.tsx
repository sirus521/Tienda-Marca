import { brand, establishedLabel } from "@/config/brand";
import { cn } from "@/lib/utils/cn";

import { LogoMark } from "./logo-mark";

type LogoProps = {
  /** `lockup` añade "EST. 2026" bajo el monograma, como en el logo. */
  variant?: "monogram" | "lockup";
  /** Ancho del monograma en píxeles. */
  size?: number;
  className?: string;
  /** Cuando el logo es decorativo (ya hay texto que nombra la marca cerca). */
  decorative?: boolean;
};

/**
 * Logo completo de la marca.
 *
 * Estructura tomada del logo: el monograma `AC` domina, y el año de
 * fundación aparece debajo en una serif de bronce, con espaciado amplio.
 * El bronce es el único acento cromático de toda la identidad: se usa aquí
 * y en casi ningún otro lugar, para que conserve su peso.
 */
export function Logo({ variant = "monogram", size = 32, className, decorative = false }: LogoProps) {
  const isLockup = variant === "lockup";

  return (
    <span className={cn("inline-flex flex-col items-center", isLockup && "gap-1.5", className)}>
      {/*
        El ancho es dinámico (prop `size`), así que no puede resolverse con
        clases estáticas de Tailwind. Se fija en el contenedor y el SVG lo
        hereda con `w-full`, conservando su proporción 1:1 y sin layout shift.
      */}
      <span className="block shrink-0" style={{ width: size }}>
        <LogoMark
          className="w-full text-ink"
          title={decorative ? undefined : brand.identity.name}
        />
      </span>

      {isLockup ? (
        /* El año, como en el logo: serif pequeña en bronce, muy espaciada. */
        <span
          className="font-display text-[0.5rem] leading-none tracking-[0.3em] text-bronze uppercase"
          aria-hidden="true"
        >
          {establishedLabel}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Marca compacta para espacios reducidos (favicon textual, menú móvil).
 * Solo el monograma, sin el lockup del año.
 */
export function LogoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center bg-ink text-bone",
        className,
      )}
    >
      <LogoMark className="w-6 text-bone" />
    </span>
  );
}