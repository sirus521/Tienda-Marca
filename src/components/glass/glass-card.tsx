import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type GlassCardProps = {
  children: ReactNode;
  /** Clases del envolvente de vidrio. */
  className?: string;
  /** Clases del contenedor interno: relleno y distribución. */
  contentClassName?: string;
};

/**
 * Tarjeta de vidrio de la tienda pública.
 *
 * Es un componente de servidor a propósito: el vidrio es CSS puro
 * (`backdrop-filter` sobre papel), no necesita JavaScript. Así puede
 * vivir en el hero —donde el LCP no puede depender de que cargue un
 * paquete de animación— sin abrir una isla de cliente, y también en
 * cualquier bloque de contenido.
 *
 * Para una entrada por carga o por scroll, envuélvela con
 * `animate-fade-up` o con `<Reveal>` en el PADRE: el `transform` va
 * en el envolvente y el `backdrop-filter` en este nodo. Un `transform`
 * sobre el mismo nodo que el vidrio rompe el desenfoque en varios
 * navegadores, por eso los dos se separan siempre.
 *
 * El vidrio es translúcido a propósito: solo se nota cuando hay algo
 * detrás (papel, rejilla, el monograma). Nunca glow.
 */
export function GlassCard({ children, className, contentClassName }: GlassCardProps) {
  return (
    <div className={cn("glass-ac glass-ac-sheen", className)}>
      <div className={cn("glass-ac-content", contentClassName)}>{children}</div>
    </div>
  );
}
