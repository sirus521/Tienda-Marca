import { cn } from "@/lib/utils/cn";

/**
 * Variantes visuales del botón.
 *
 * Se exporta como función para poder aplicarla también a `Link`, que debe
 * verse idéntico a un botón sin dejar de ser un enlace (importante para SEO
 * y para abrir en pestaña nueva). Un botón que en realidad es un `<a>` es
 * accesible; un `<a>` que finge ser botón, no.
 *
 * Nota sobre el foco: nunca se usa `outline-none`. El anillo de foco es
 * requisito de accesibilidad y está definido globalmente en `globals.css`.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-mono text-label uppercase tracking-[0.14em] transition-[transform,background-color,color,border-color] duration-300 ease-out-expo select-none disabled:pointer-events-none disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  /* Máximo contraste: tinta sobre papel. Es el CTA principal. */
  primary: "bg-ink text-bone hover:bg-ink-2 active:translate-y-px",
  /* Contorno de 1px. Estructura sin relleno. */
  secondary:
    "border border-line-strong text-ink hover:border-ink hover:bg-ink hover:text-bone active:translate-y-px",
  /* Sin caja: solo texto con subrayado que barre. */
  ghost: "text-ink hover:bg-bone-2 active:translate-y-px",
  danger: "border border-danger/40 text-danger hover:bg-danger hover:text-bone active:translate-y-px",
};

/* Alturas mínimas de 44px en md y lg: es el área táctil mínima recomendada. */
const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5",
  md: "h-11 px-5",
  lg: "h-14 px-8",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);
}