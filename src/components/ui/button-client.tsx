import type { ButtonHTMLAttributes } from "react";

import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

/**
 * Botón. Para navegación se prefiere `Link` con `buttonStyles()` aplicado,
 * así el elemento es un enlace real y no un botón con JS.
 *
 * `type="button"` por defecto es deliberado: dentro de un `<form>`, un botón
 * sin tipo se comporta como `submit` y provoca envíos accidentales.
 */
export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}
