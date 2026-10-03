import type { Transition, Variants } from "motion/react";

/**
 * Tokens de movimiento
 * ============================================================================
 * Una sola fuente de verdad para duraciones, easings y variantes. Si cada
 * componente inventa sus números, la interfaz se siente inconsistente: unas
 * cosas rebotan y otras se arrastran.
 *
 * Estos valores están alineados con los tokens de CSS (`--ease-*`) para que
 * las animaciones de CSS y las de Motion se sientan como el mismo sistema.
 */

/** Aceleración fuerte al final. Sensación precisa y cara. */
export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Similar pero un poco más suave. Ideal para entradas de contenido. */
export const easeOutQuint: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Simétrico, para transiciones que van y vuelven. */
export const easeInOutQuart: [number, number, number, number] = [0.76, 0, 0.24, 1];

/** Duración base de una revelación. Suficiente para leerse, no para aburrir. */
export const DURATION = {
  fast: 0.35,
  base: 0.7,
  slow: 1.1,
} as const;

/** Transición estándar para entradas de contenido. */
export const revealTransition: Transition = {
  duration: DURATION.base,
  ease: easeOutExpo,
};

/** Desplazamiento físico de las revelaciones en scroll, en píxeles. */
export const REVEAL_DISTANCE = 24;

/**
 * Variante de revelación: aparece y sube.
 * Se usa con `whileInView` y `viewport={{ once: true }}`.
 */
export function revealVariants(distance: number = REVEAL_DISTANCE): Variants {
  return {
    hidden: { opacity: 0, y: distance },
    visible: { opacity: 1, y: 0, transition: revealTransition },
  };
}

/**
 * Contenedor que escalona a sus hijos.
 * `staggerChildren` a 60 ms: se percibe como secuencia, no como retraso.
 */
export function staggerContainer(stagger: number = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/* ==========================================================================
   PANEL AC
   ========================================================================== */

/** Entrada de tarjeta de vidrio: sube, se asienta y se abre. */
export const adminCardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATION.base, ease: easeOutExpo },
  },
};

/** Escalonado para la cuadrícula de estadísticas. */
export function adminStagger(stagger: number = 0.08): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren: 0.08 },
    },
  };
}

/** Deriva lenta de las formas detrás del vidrio. */
export const adminDriftVariants: Variants = {
  initial: { x: 0, y: 0 },
  animate: {
    x: [0, 42, -18, 0],
    y: [0, -30, 22, 0],
    transition: { duration: 20, repeat: Infinity, ease: easeInOutQuart },
  },
};

/** Respiración del marcador de agua del monograma. */
export const adminWatermarkVariants: Variants = {
  initial: { y: 0, rotate: 0 },
  animate: {
    y: [0, -16, 0],
    rotate: [0, 1.2, 0],
    transition: { duration: 16, repeat: Infinity, ease: easeInOutQuart },
  },
};

/** Pulso de la línea de acento en una tarjeta. */
export const adminAccentVariants: Variants = {
  initial: { scaleX: 0.28 },
  animate: {
    scaleX: [0.28, 1, 0.28],
    transition: { duration: 4.5, repeat: Infinity, ease: easeInOutQuart },
  },
};

/**
 * Revelado por máscara: el texto sube desde detrás de una línea.
 * `overflow: hidden` en el padre + desplazamiento del hijo al 100%.
 */
export const maskUpVariants: Variants = {
  hidden: { y: "110%" },
  visible: { y: "0%", transition: { duration: 0.9, ease: easeOutExpo } },
};
