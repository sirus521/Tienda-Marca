import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Campos del formulario
 * ============================================================================
 * Un solo lugar que decide cómo se ve un campo en toda la tienda, y sobre todo
 * cómo se ve cuando hay un error.
 *
 * POR QUÉ EL ERROR VA DENTRO DEL `<label>`
 * Porque si el mensaje se pinta debajo del campo pero fuera de su `<label>`, un
 * lector de pantalla anuncia el campo sin decir que está mal. Con `aria-describedby`
 * e `aria-invalid` el mensaje se anuncia junto al campo. El borde rojo solo es la
 * confirmación visual de algo que ya se dijo en texto, nunca la única forma de
 * enterarse.
 *
 * No se usa `outline-none` en ningún sitio: el anillo de foco viene de
 * `globals.css` y es requisito de accesibilidad.
 */
type FieldProps = {
  label: string;
  /** Mensaje de error. Su presencia cambia el borde a `danger`. */
  error?: string;
  /** Texto de ayuda. Se anuncia antes que el error. */
  hint?: string;
  required?: boolean;
  className?: string;
};

/**
 * El `name` es obligatorio a propósito.
 *
 * En los atributos nativos de React es opcional, pero un input sin `name` no
 * aparece en el `FormData` y el formulario envía un campo vacío sin avisar. El
 * error sale tarde, en el servidor, cuando ya no se sabe qué campo se saltó.
 */
type NamedProps = { name: string };

const controlStyles =
  "w-full border bg-transparent px-3.5 py-3 text-base text-ink transition-colors duration-200 placeholder:text-ash-2 disabled:opacity-50";

function fieldId(name: string): string {
  return `campo-${name}`;
}

function describedBy(name: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${fieldId(name)}-hint` : null, error ? `${fieldId(name)}-error` : null];
  const value = ids.filter(Boolean).join(" ");
  return value === "" ? undefined : value;
}

export function TextField({
  label,
  error,
  hint,
  required,
  className,
  name,
  ...props
}: FieldProps & NamedProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId(name)} className="font-mono text-xs tracking-[0.14em] text-ash uppercase">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <input
        id={fieldId(name)}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        aria-required={required || undefined}
        className={cn(
          controlStyles,
          error ? "border-danger" : "border-line hover:border-line-strong",
        )}
        {...props}
      />

      <FieldMessages name={name} hint={hint} error={error} />
    </div>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className,
  name,
  rows = 3,
  ...props
}: FieldProps & NamedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fieldId(name)} className="font-mono text-xs tracking-[0.14em] text-ash uppercase">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>

      <textarea
        id={fieldId(name)}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        aria-required={required || undefined}
        className={cn(
          controlStyles,
          "resize-y",
          error ? "border-danger" : "border-line hover:border-line-strong",
        )}
        {...props}
      />

      <FieldMessages name={name} hint={hint} error={error} />
    </div>
  );
}

function FieldMessages({
  name,
  hint,
  error,
}: {
  name: string;
  hint?: string;
  error?: string;
}) {
  return (
    <>
      {hint ? (
        <p id={`${fieldId(name)}-hint`} className="text-xs text-ash-2">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={`${fieldId(name)}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

/* ============================================================================
   SELECCIÓN
   ============================================================================
   Los botones de opción son radios reales, no divs con onclick. Se pueden
   recorrer con el teclado, se anuncian con su etiqueta y funcionan si el CSS
   tarda en cargar. El dato vive en un `name` real, así que el `FormData` lo
   recoge sin código extra.
   ============================================================================ */
export function RadioOption({
  name,
  value,
  label,
  description,
  defaultChecked,
  disabled,
  className,
}: {
  name: string;
  value: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 border border-line p-4 transition-colors duration-200",
        "has-[:checked]:border-ink has-[:checked]:bg-bone-2",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
        disabled ? "cursor-not-allowed opacity-50" : "hover:border-line-strong",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-ink"
      />

      <span className="flex flex-col gap-0.5">
        <span className="text-sm text-ink">{label}</span>
        {description ? <span className="text-xs text-ash">{description}</span> : null}
      </span>
    </label>
  );
}
