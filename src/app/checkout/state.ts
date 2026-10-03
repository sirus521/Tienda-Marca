/**
 * Estado del checkout
 * ============================================================================
 * Tipos y valores iniciales del formulario, en un módulo NORMAL a propósito.
 *
 * POR QUÉ NO ESTÁ EN `actions.ts`
 * Un archivo con `"use server"` solo puede exportar funciones async. Exportar
 * una constante —por muy inocua que parezca— hace que Next rechace el módulo al
 * cargarlo como server action y el checkout devuelva 500 al enviar el
 * formulario. Es un fallo que `tsc`, ESLint y `next build` NO detectan: solo
 * aparece en runtime, cuando se invoca la acción.
 *
 * Aquí viven el tipo y el estado inicial; en `actions.ts` queda únicamente la
 * acción, que sí es async.
 */

/** Lo que el formulario necesita saber para pintarse a sí mismo. */
export type CheckoutState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Folio del pedido creado. */
  folio?: string;
  /** Enlace a WhatsApp. Solo en `success`. */
  whatsappUrl?: string;
  /** Errores por campo, para pintar el mensaje junto al input. */
  fieldErrors?: Record<string, string>;
};

/** Estado de partida: nada enviado todavía, así que no hay nada que decir. */
export const initialCheckoutState: CheckoutState = { status: "idle" };
