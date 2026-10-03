"use client";

import { m, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

type AnimatedNumberProps = {
  value: number;
  /** Locale de `Number.toLocaleString`. Por defecto es-MX. */
  locale?: string;
  className?: string;
};

/**
 * Número que cuenta hasta su valor con un resorte.
 *
 * `useSpring` suaviza el conteo; `useTransform` redondea el valor
 * intermedio para que nunca se pinte un decimal. Con movimiento
 * reducido el resorte se resuelve de inmediato.
 */
export function AnimatedNumber({ value, locale = "es-MX", className }: AnimatedNumberProps) {
  const target = useMotionValue(0);
  const spring = useSpring(target, { stiffness: 56, damping: 18 });
  const text = useTransform(spring, (latest) => Math.round(latest).toLocaleString(locale));

  useEffect(() => {
    target.set(value);
  }, [value, target]);

  return <m.span className={className}>{text}</m.span>;
}
