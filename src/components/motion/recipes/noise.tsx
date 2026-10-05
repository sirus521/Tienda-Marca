"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils/cn";

/* -------------------------------------------------------------------------
   Noise
   ===========================================================================
   Grano de película (canvas 2D), de motion-anything. Sobre el hero oscuro,
   encima del `dither`, aporta textura de impresión. Monocromo (r=g=b), lo
   refresca cada 2 frames y congela en un solo frame bajo movimiento reducido.
   SIN GLOW: es ruido de luminancia, no luz.
   ------------------------------------------------------------------------- */

type NoiseProps = {
  className?: string;
  /** Opacidad del grano (0–255). 15 es casi imperceptible; ~26 lo que se nota. */
  alpha?: number;
  /** Tamaño del patrón de grano en px (cuadrado). */
  size?: number;
};

export function Noise({ className, alpha = 26, size = 1024 }: NoiseProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((el as HTMLDivElement & { __noise?: true }).__noise) return;
    (el as HTMLDivElement & { __noise?: true }).__noise = true;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:100%;height:100%;display:block;image-rendering:pixelated";
    el.appendChild(canvas);

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    canvas.width = size;
    canvas.height = size;

    const drawGrain = () => {
      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = alpha;
      }
      ctx.putImageData(imageData, 0, 0);
    };

    if (reduced) {
      drawGrain();
    } else {
      let frame = 0;
      const loop = () => {
        if (frame % 2 === 0) drawGrain();
        frame++;
        raf = requestAnimationFrame(loop);
      };
      let raf = requestAnimationFrame(loop);
      // Cancelamos en el cleanup.
      const cancel = () => cancelAnimationFrame(raf);
      // guardamos cancel para el cierre
      (el as HTMLDivElement & { __noiseCancel?: () => void }).__noiseCancel = cancel;
    }

    return () => {
      (el as HTMLDivElement & { __noise?: true }).__noise = undefined;
      (el as HTMLDivElement & { __noiseCancel?: () => void }).__noiseCancel?.();
    };
  }, [alpha, size]);

  return <div ref={ref} aria-hidden="true" className={cn("pointer-events-none", className)} />;
}
