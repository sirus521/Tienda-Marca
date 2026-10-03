"use client";

import { AnimatePresence, m, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";

import { CartLineRow } from "@/components/cart/cart-line-row";
import { buttonStyles } from "@/components/ui/button";
import { easeOutExpo } from "@/lib/motion/tokens";
import { formatMoney } from "@/lib/domain/money";
import { cartStore, useCartLines, useCartOpen, useCartSubtotalCents } from "@/lib/stores/cart-store";

/**
 * Drawer de la bolsa
 * ============================================================================
 * Panel lateral que se abre al agregar algo. Su lugar en el flujo está donde va
 * el carrito en Amazon y Mercado Libre, y también es donde está el patrón que
 * la gente ya conoce: la confirmación de "agregado" no debe hacerte perder la
 * página donde estabas.
 *
 * DECISIONES
 *
 *  1. ES UN `<aside>`, NO UNA PÁGINA. Cierra con Escape, con el fondo y con el
 *     botón de cerrar. Quedarse atrapado en un panel que se abrió solo es una
 *     forma innecesaria de perder la venta.
 *
 *  2. MONTAJE CONDICIONAL. No se pinta en el DOM mientras está cerrado, con lo
 *     que no hay ni lista de imágenes que cargar ni foco que robar.
 *
 *  3. RESPETA `prefers-reduced-motion`. Si quien navega pidió menos animación,
 *     el panel aparece y desaparece sin desplazarse. El contenido se sigue
 *     viendo igual de claro; lo que se evita es el movimiento.
 */
export function CartDrawer() {
  const isOpen = useCartOpen();
  const lines = useCartLines();
  const subtotalCents = useCartSubtotalCents();
  const close = cartStore((state) => state.close);
  const prefersReducedMotion = useReducedMotion();

  /* Escape cierra, y el scroll de fondo se congela mientras esté abierto. */
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    root.classList.add("no-scroll");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      root.classList.remove("no-scroll");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <m.div
          key="cart-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.24 }}
          className="fixed inset-0 z-50"
        >
          {/* Fondo: cerrar al pulsar fuera es lo que la gente espera. */}
          <button
            type="button"
            aria-label="Cerrar la bolsa"
            onClick={close}
            className="absolute inset-0 h-full w-full cursor-default bg-ink/35 backdrop-blur-[2px]"
          />

          <m.aside
            role="dialog"
            aria-modal="true"
            aria-label="Tu bolsa"
            initial={{ x: prefersReducedMotion ? 0 : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: prefersReducedMotion ? 0 : "100%" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.42, ease: easeOutExpo }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-bone shadow-2xl"
          >
            {/* ---------------- Cabecera ---------------- */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 className="font-mono text-label text-ink uppercase">
                Bolsa {lines.length > 0 ? `(${lines.length})` : ""}
              </h2>

              <button
                type="button"
                onClick={close}
                className="flex size-11 items-center justify-center -mr-2 text-ink transition-colors duration-200 hover:bg-bone-2"
              >
                <span className="sr-only">Cerrar la bolsa</span>
                <span aria-hidden="true" className="relative block size-4">
                  <span className="absolute top-1/2 left-0 block h-px w-full rotate-45 bg-current" />
                  <span className="absolute top-1/2 left-0 block h-px w-full -rotate-45 bg-current" />
                </span>
              </button>
            </div>

            {/* ---------------- Contenido ---------------- */}
            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <p className="text-ash">Tu bolsa está vacía.</p>
                <Link
                  href="/tienda"
                  onClick={close}
                  className={buttonStyles({ variant: "secondary" })}
                >
                  Ver el catálogo
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
                  {lines.map((line) => (
                    <CartLineRow key={line.variantId} line={line} />
                  ))}
                </ul>

                {/* ---------------- Pie ---------------- */}
                <div className="shrink-0 border-t border-line px-5 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-label text-ash uppercase">Subtotal</span>
                    <span className="font-mono text-xl tabular-nums text-ink">
                      {formatMoney(subtotalCents)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-ash-2">
                    El envío se confirma por WhatsApp y no está incluido aquí.
                  </p>

                  <Link
                    href="/carrito"
                    onClick={close}
                    className={buttonStyles({ size: "lg", fullWidth: true, className: "mt-4" })}
                  >
                    Ir a la bolsa
                  </Link>

                  <button
                    type="button"
                    onClick={close}
                    className={buttonStyles({
                      variant: "ghost",
                      fullWidth: true,
                      className: "mt-1",
                    })}
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </m.aside>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
