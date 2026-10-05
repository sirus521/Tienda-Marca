"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";

import { submitOrderAction } from "@/app/checkout/actions";
import { initialCheckoutState } from "@/app/checkout/state";
import { CartLineRow } from "@/components/cart/cart-line-row";
import { Button } from "@/components/ui/button-client";
import { buttonStyles } from "@/components/ui/button";
import { RadioOption, TextAreaField, TextField } from "@/components/ui/field";
import { formatMoney } from "@/lib/domain/money";
import {
  cartStore,
  useCartHasHydrated,
  useCartLines,
  useCartSubtotalCents,
} from "@/lib/stores/cart-store";

/**
 * Formulario de checkout
 * ============================================================================
 * Recoge los datos de quien compra y entrega el pedido a la server action.
 *
 * LAS LÍNEAS VIAJAN SOLO CON ID Y CANTIDAD
 * El navegador manda `[{ variantId, quantity }]`, nada más. El nombre, el
 * precio y la foto se releen en el servidor. Si el carrito mandara el precio,
 * bastaría abrir la consola y pagar $1.
 *
 * `useActionState` de React, no `useFormState` de react-dom: la primera es la
 * que va a existir y trae `isPending`, que es lo que permite deshabilitar el
 * botón mientras se guarda y evitar el doble pedido. Esa navegación
 * duplicada es un problema real cuando el botón no se bloquea.
 */
export function CheckoutForm() {
  const [state, formAction, isPending] = useActionState(submitOrderAction, initialCheckoutState);

  const lines = useCartLines();
  const subtotalCents = useCartSubtotalCents();
  const hydrated = useCartHasHydrated();

  const clear = cartStore((action) => action.clear);

  /* La bolsa se vacía SOLO cuando el pedido se confirmó. Si el envío falla, la
     bolsa intacta es lo que permite reintentar sin volver a armarla.

     No hace falta ninguna bandera para evitar que se repita: el efecto depende
     de `state.status`, y una vez en "success" el formulario se desmonta y no hay
     forma de volver a enviar. Además, vaciar dos veces es inofensivo. Meter un
     `useState` de guardia aquí solo provocaría el render en cascada que
     `react-hooks/set-state-in-effect` señala. */
  useEffect(() => {
    if (state.status === "success") clear();
  }, [state.status, clear]);

  const fieldError = (field: string) => state.fieldErrors?.[field];

  /* ---------------------------------------------------------------------
     PANTALLA DE CONFIRMACIÓN
     --------------------------------------------------------------------- */
  if (state.status === "success" && state.whatsappUrl) {
    return (
      <div className="flex flex-col items-center gap-6 border border-line px-6 py-14 text-center">
        <p className="eyebrow">Pedido registrado</p>

        <p className="font-display text-heading text-ink">
          Folio <span className="font-mono">{state.folio}</span>
        </p>

        <p className="max-w-sm text-ash">
          Guarda tu folio. Al continuar se abre WhatsApp con este mismo pedido ya escrito para que
          solo confirmes disponibilidad, envío y forma de pago.
        </p>

        {/* Un enlace que se ve como botón, no un botón con un `<a>` dentro:
            anidar un enlace dentro de un button es HTML inválido y rompe la
            navegación con teclado y los lectores de pantalla. */}
        <a
          href={state.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ size: "lg", className: "mt-2" })}
        >
          Abrir WhatsApp
        </a>

        <Link
          href="/tienda"
          className="font-mono text-xs tracking-[0.14em] text-ash-2 uppercase underline-offset-4 hover:text-ink hover:underline"
        >
          Seguir comprando
        </Link>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
     BOLSA VACÍA
     --------------------------------------------------------------------- */
  if (hydrated && lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 border border-line px-6 py-14 text-center">
        <p className="text-ash">Tu bolsa está vacía.</p>
        <Link
          href="/tienda"
          className="font-mono text-label tracking-[0.14em] text-ink uppercase underline-offset-4 hover:underline"
        >
          Ver el catálogo
        </Link>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
     FORMULARIO
     --------------------------------------------------------------------- */
  return (
    <form action={formAction} className="flex flex-col gap-10">
      {/* Las líneas viajan en un único campo JSON. Ver `parseLines` en actions.ts. */}
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        )}
      />

      {/* ---------------- Resumen ---------------- */}
      <section className="flex flex-col gap-1">
        <h2 className="eyebrow">Tu pedido</h2>

        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <CartLineRow key={line.variantId} line={line} />
          ))}
        </ul>

        <div className="flex items-baseline justify-between pt-4">
          <span className="font-mono text-label text-ash uppercase">Subtotal</span>
          <span className="font-mono text-xl text-ink tabular-nums">
            {formatMoney(subtotalCents)}
          </span>
        </div>

        <p className="text-xs text-ash-2">
          El envío se confirma por WhatsApp y no está incluido en el total.
        </p>
      </section>

      {/* ---------------- Entrega ---------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">Cómo lo quieres</h2>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <RadioOption
            name="deliveryMethod"
            value="pickup"
            label="Recojo en punto"
            description="Monterrey"
            defaultChecked
            className="flex-1"
          />
          <RadioOption
            name="deliveryMethod"
            value="local"
            label="Entrega local"
            description="Costo por acordar"
            className="flex-1"
          />
          <RadioOption
            name="deliveryMethod"
            value="national"
            label="Envío nacional"
            description="Te cotizamos"
            className="flex-1"
          />
        </div>
      </section>

      {/* ---------------- Datos ---------------- */}
      <section className="flex flex-col gap-4">
        <h2 className="eyebrow">Tus datos</h2>

        {state.status === "error" && state.message ? (
          <p
            role="alert"
            className="border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {state.message}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="fullName"
            label="Nombre completo"
            required
            autoComplete="name"
            error={fieldError("customer.fullName")}
            className="sm:col-span-2"
          />

          <TextField
            name="phone"
            label="Teléfono"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="81 1234 5678"
            hint="Con 10 dígitos, o con 52 al inicio."
            error={fieldError("customer.phone")}
          />

          <TextField
            name="email"
            label="Correo"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Opcional"
            error={fieldError("customer.email")}
          />

          <TextField
            name="postalCode"
            label="Código postal"
            autoComplete="postal-code"
            inputMode="numeric"
            placeholder="64000"
            error={fieldError("customer.postalCode")}
          />

          <TextField
            name="city"
            label="Ciudad"
            autoComplete="address-level2"
            error={fieldError("customer.city")}
          />

          <TextField
            name="state"
            label="Estado"
            autoComplete="address-level1"
            error={fieldError("customer.state")}
            className="sm:col-span-2"
          />

          <TextAreaField
            name="notes"
            label="Referencias para la entrega"
            placeholder="Horario, punto de referencia, color que prefieres…"
            hint="Opcional. Lo leemos al confirmar."
            error={fieldError("customer.notes")}
            className="sm:col-span-2"
          />
        </div>
      </section>

      {/* ---------------- Cupón ---------------- */}
      <section className="border border-line p-4">
        <label className="flex flex-col gap-1 text-xs text-ash">
          Cupón
          <input
            name="couponCode"
            placeholder="¿Tienes un cupón? Escríbelo aquí"
            className="border border-line bg-transparent px-3 py-2.5 text-ink"
          />
        </label>
        {state.status === "error" && state.message ? (
          <p className="mt-2 text-xs text-danger">{state.message}</p>
        ) : null}
      </section>

      {/* ---------------- Envío ---------------- */}
      <div className="flex flex-col gap-4">
        <Button type="submit" size="lg" fullWidth disabled={isPending || !hydrated}>
          {isPending ? "Guardando…" : "Continuar por WhatsApp"}
        </Button>

        <p className="text-center text-xs text-ash-2">
          Registramos tu pedido y te damos el botón para abrir WhatsApp con el detalle. No se cobra
          nada aquí.
        </p>
      </div>
    </form>
  );
}
