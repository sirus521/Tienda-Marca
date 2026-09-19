"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Desplazamiento suave con Lenis.
 *
 * Por qué: el scroll nativo del navegador da saltos discretos. Lenis lo
 * interpola, y eso hace que las animaciones ligadas al scroll (parallax,
 * imagen sticky, barra de progreso) se sientan continuas en vez de a
 * tirones.
 *
 * Decisiones de implementación:
 *  - Si el sistema pide movimiento reducido, Lenis NO se inicializa. El
 *    scroll vuelve a ser el nativo, que es lo correcto para esas personas.
 *  - El bucle usa `requestAnimationFrame` y se cancela al desmontar. Sin
 *    esto, cada navegación dejaría un bucle vivo consumiendo CPU.
 *  - `<html>` ya tiene la clase `lenis` desde el layout, así que el CSS de
 *    Lenis aplica antes de que este efecto corra. Eso evita el salto de
 *    layout en el primer frame.
 */
export function SmoothScroll() {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.1,
      // Curva de interpolación alineada con `--ease-out-expo` del sistema.
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // En táctil el scroll nativo ya es fluido; interceptarlo empeora.
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1.6,
    });

    let frameId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frameId = requestAnimationFrame(raf);
    };
    frameId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frameId);
      lenis.destroy();
    };
  }, [prefersReducedMotion]);

  return null;
}