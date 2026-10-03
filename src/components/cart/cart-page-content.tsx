"use client";

import Link from "next/link";

import { CartLineRow } from "@/components/cart/cart-line-row";
import { buttonStyles } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain/money";
import { useCartHasHydrated, useCartLines, useCartSubtotalCents } from "@/lib/stores/cart-store";

/**
 * Contenido de la página de bolsa
 * ============================================================================
 * La versión completa del carrito, en su propia página, para quien prefiere
 * revisar todo con calma antes de pagar. El drawer sigue siendo el camino
 * rápido; esta es la vista con calma.
 *
 * Comparte estado con el drawer y con el checkout: los tres leen el mismo store
 * de Zustand, así que cambiar una cantidad aquí se refleja al instante al abrir
 * el panel y no hay copias que se desincronicen.
 *
 * HIDRATACIÓN
 * En el servidor la bolsa siempre está vacía. Antes de hidratar se muestra un
 * esqueleto en vez del estado vacío: si se pintara "tu bolsa está vacía" y un
 * segundo después aparecieran artículos, sería un parpadeo y una falsa alarma
 * para quien sí tenía cosas guardadas.
 */
export function CartPageContent() {
  const lines = useCartLines();
  const subtotalCents = useCartSubtotalCents();
  const hydrated = useCartHasHydrated();

  /* ---------------------------------------------------------------------
     BOLSA VACÍA
     --------------------------------------------------------------------- */
  if (hydrated && lines.length === 0) {
    return (
      <div className="border border-line px-6 py-20 text-center">
        <p className="eyebrow">Tu bolsa</p>
        <h2 className="mt-5 text-heading">Aquí no hay nada todavía</h2>
        <p className="mx-auto mt-4 max-w-sm text-ash">
          Elige una talla en la tienda y la agregamos aquí. La bolsa se guarda en este navegador,
          así que no se pierde si recargas.
        </p>
        <div className="mt-9 flex justify-center">
          <Link href="/tienda" className={buttonStyles({ size: "lg" })}>
            Ver el catálogo
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
     ESQUELETO ANTES DE HIDRATAR
     --------------------------------------------------------------------- */
  if (!hydrated) {
    return (
      <div className="flex flex-col gap-8" aria-busy="true">
        <div className="h-24 animate-pulse bg-bone-2" />
        <div className="h-24 animate-pulse bg-bone-2" />
        <p className="sr-only">Cargando tu bolsa…</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------
     BOLSA CON ARTÍCULOS
     --------------------------------------------------------------------- */
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
      {/* ---------------- Artículos ---------------- */}
      <section aria-label="Artículos en tu bolsa">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => (
            <CartLineRow key={line.variantId} line={line} />
          ))}
        </ul>

        <div className="mt-6">
          <Link
            href="/tienda"
            className="font-mono text-xs tracking-[0.14em] text-ash-2 uppercase underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            Seguir comprando
          </Link>
        </div>
      </section>

      {/* ---------------- Resumen ---------------- */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border border-line p-6">
          <h2 className="eyebrow">Resumen</h2>

          <dl className="mt-5 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <dt className="font-mono text-label text-ash uppercase">Artículos</dt>
              <dd className="font-mono text-sm text-ink tabular-nums">
                {lines.reduce((total, line) => total + line.quantity, 0)}
              </dd>
            </div>

            <div className="flex items-baseline justify-between">
              <dt className="font-mono text-label text-ash uppercase">Subtotal</dt>
              <dd className="font-mono text-xl text-ink tabular-nums">
                {formatMoney(subtotalCents)}
              </dd>
            </div>

            <div className="flex items-baseline justify-between">
              <dt className="font-mono text-label text-ash uppercase">Envío</dt>
              <dd className="font-mono text-sm text-ash">Por confirmar</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-ash-2">
            El envío no está incluido en el total. Se calcula y se confirma por WhatsApp antes de
            pagar nada.
          </p>

          <Link
            href="/checkout"
            className={buttonStyles({ size: "lg", fullWidth: true, className: "mt-6" })}
          >
            Continuar al checkout
          </Link>
        </div>

        {/* La reassuring nota de que no se cobra nada aquí baja la fricción
            justo en el momento de mayor dudas. */}
        <p className="mt-4 text-center text-xs text-ash-2">
          No se pide pago todavía. Registras tu pedido y lo confirmas por WhatsApp.
        </p>
      </aside>
    </div>
  );
}
