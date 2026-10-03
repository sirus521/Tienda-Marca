import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type MarqueeProps = {
  children: ReactNode;
  /** Invierte el sentido del desplazamiento. */
  reverse?: boolean;
  /** Duración de un ciclo completo, en segundos. */
  duration?: number;
  /** Pausa el desplazamiento al pasar el cursor. */
  pauseOnHover?: boolean;
  className?: string;
};

/**
 * Marquee infinito.
 *
 * Cómo funciona: se renderizan DOS copias idénticas del contenido, lado a
 * lado, y cada una se desplaza exactamente el 100% de su propio ancho. Cuando
 * la primera termina de salir, la segunda ocupa su lugar y el ciclo reinicia
 * sin salto visible. Es el único método que da un bucle verdaderamente
 * continuo; desplazar una sola copia siempre deja un hueco al final.
 *
 * Decisiones:
 *  · La segunda copia va con `aria-hidden` para que un lector de pantalla no
 *    lea el contenido dos veces. Es un detalle que casi siempre se olvida.
 *  · La animación es CSS puro (`transform`), no JavaScript: corre en la GPU y
 *    no compite con el hilo principal mientras el usuario scrollea.
 *  · Con movimiento reducido, la media query global de `globals.css` congela
 *    la animación. El contenido sigue siendo legible, solo deja de moverse.
 */
export function Marquee({
  children,
  reverse = false,
  duration = 40,
  pauseOnHover = true,
  className,
}: MarqueeProps) {
  const animation = reverse ? "animate-marquee-reverse" : "animate-marquee";

  return (
    <div className={cn("group flex w-full overflow-hidden", className)}>
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 ? true : undefined}
          className={cn(
            "flex shrink-0 items-center",
            animation,
            pauseOnHover && "group-hover:[animation-play-state:paused]",
          )}
          style={{
            animationDuration: `${duration}s`,
            /* El contenido debe medir al menos el ancho del contenedor para
               que no aparezca un hueco entre las dos copias. */
            minWidth: "max-content",
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
