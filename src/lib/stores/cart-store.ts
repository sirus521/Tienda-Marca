import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { sumCents } from "@/lib/domain/money";
import type { CartLine } from "@/lib/domain/types";

/**
 * Carrito (bolsa)
 * ============================================================================
 * Estado del carrito, compartido entre la ficha de producto, el header, la
 * página de la bolsa y el checkout. Sin una pieza de estado compartida, cada
 * uno de esos cuatro puntos tendría su copia y se desincronizarían.
 *
 * DECISIONES
 *
 * 1. PERSISTENCIA EN `localStorage`.
 *    La bolsa sobrevive a un refresco y a cerrar el navegador. Perder el
 *    carrito al recargar es de las cosas que más ventas tira.
 *
 * 2. HIDRATACIÓN SEGURA.
 *    En el servidor no existe `localStorage`, así que el render del servidor
 *    siempre ve la bolsa vacía; en el cliente ya hay artículos guardados. Eso
 *    es un desajuste de hidratación clásico. Se resuelve con
 *    `useCartHasHydrated`, que mediante `getServerSnapshot` obliga a React a
 *    usar el valor del servidor durante la hidratación y el real justo
 *    después. Es la vía que React diseñó para este caso; un `useEffect` con
 *    `setState` causaría un render en cascada y ESLint lo rechaza
 *    (`react-hooks/set-state-in-effect`).
 *
 * 3. TOPE DE CANTIDAD POR LÍNEA.
 *    El tope es el stock registrado al agregar, con un máximo absoluto de 10.
 *    El stock real se revalida en el servidor al crear el pedido: aquí solo se
 *    evita que alguien ponga 500 piezas en la bolsa por diversión.
 *
 * 4. LOS DATOS DEL ARTÍCULO SE COPIAN, NO SE REFERENCIAN.
 *    `CartLine` guarda nombre, precio e imagen. Así la bolsa se pinta sin
 *    consultar el catálogo, y si el precio cambia mientras alguien la tiene
 *    abierta, esa persona sigue viendo lo que vio. El servidor valida el
 *    precio final al crear el pedido.
 */

/** Clave de almacenamiento. Lleva versión para poder migrar el formato. */
const STORAGE_KEY = "ac-bolsa-v1";

/** Tope absoluto por línea, independiente del inventario. */
export const MAX_QUANTITY_PER_LINE = 10;

export type CartState = {
  lines: CartLine[];
  /** Estado del drawer lateral. */
  isOpen: boolean;
};

export type CartActions = {
  /** Agrega una variante o suma cantidad si ya estaba en la bolsa. */
  addLine: (line: CartLine, quantity?: number) => void;
  removeLine: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export type CartStore = CartState & CartActions;

/** Cantidad máxima permitida para una línea concreta. */
function maxFor(line: CartLine): number {
  return Math.max(1, Math.min(line.maxStock || MAX_QUANTITY_PER_LINE, MAX_QUANTITY_PER_LINE));
}

export const cartStore = create<CartStore>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,

      addLine: (line, quantity = 1) =>
        set((state) => {
          const existing = state.lines.find((item) => item.variantId === line.variantId);

          if (existing) {
            const limit = maxFor(existing);
            return {
              lines: state.lines.map((item) =>
                item.variantId === line.variantId
                  ? {
                      ...item,
                      /* Se refresca el tope: si el stock cambió desde que se
                         agregó, se respeta el valor más reciente. */
                      maxStock: line.maxStock || item.maxStock,
                      quantity: Math.min(item.quantity + quantity, limit),
                    }
                  : item,
              ),
            };
          }

          return {
            lines: [...state.lines, { ...line, quantity: Math.min(quantity, maxFor(line)) }],
          };
        }),

      removeLine: (variantId) =>
        set((state) => ({
          lines: state.lines.filter((item) => item.variantId !== variantId),
        })),

      setQuantity: (variantId, quantity) =>
        set((state) => ({
          /* Cantidad 0 elimina la línea. Es lo que espera el usuario al bajar
             con el control hasta cero; obligarlo a pulsar "eliminar" aparte es
             fricción innecesaria. */
          lines:
            quantity <= 0
              ? state.lines.filter((item) => item.variantId !== variantId)
              : state.lines.map((item) =>
                  item.variantId === variantId
                    ? { ...item, quantity: Math.min(quantity, maxFor(item)) }
                    : item,
                ),
        })),

      clear: () => set({ lines: [] }),

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      /* El estado del drawer no se persiste: reabrir el navegador con el panel
         abierto encima del contenido sería desconcertante. */
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

/* ============================================================================
   HOOKS DE LECTURA
   ============================================================================
   Cada hook devuelve un valor primitivo o una referencia estable. Zustand v5
   compara por identidad: devolver un objeto nuevo en cada render provocaría un
   bucle infinito de renders.
   ============================================================================ */

/** `true` cuando la bolsa ya se leyó de `localStorage` en el cliente. */
export function useCartHasHydrated(): boolean {
  return useSyncExternalStore(
    /* Zustand notifica cuando termina de hidratar. Si ya había hidratado antes
       de suscribirse, el valor correcto lo aporta `getSnapshot` en el primer
       render. */
    (onChange) => cartStore.persist.onFinishHydration(onChange),
    () => cartStore.persist.hasHydrated(),
    /* Servidor y primer render de hidratación: todavía no hay bolsa. */
    () => false,
  );
}

/** Líneas de la bolsa. */
export function useCartLines(): CartLine[] {
  return cartStore((state) => state.lines);
}

/** Total de piezas. Es el número que muestra la cabecera. */
export function useCartCount(): number {
  const hydrated = useCartHasHydrated();
  const count = cartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));

  /* Antes de hidratar devuelve 0 para que servidor y cliente coincidan. */
  return hydrated ? count : 0;
}

/** Subtotal en centavos, sin envío. */
export function useCartSubtotalCents(): number {
  const hydrated = useCartHasHydrated();
  const subtotal = cartStore((state) =>
    sumCents(state.lines.map((line) => line.unitPriceCents * line.quantity)),
  );

  return hydrated ? subtotal : 0;
}

/** Estado del drawer lateral. */
export function useCartOpen(): boolean {
  return cartStore((state) => state.isOpen);
}

/* ============================================================================
   ACCESO FUERA DE REACT
   ============================================================================
   Para construir el pedido desde un manejador de evento o desde el checkout,
   donde no hay render y por tanto no se pueden usar hooks.
   ============================================================================ */

/** Estado actual de la bolsa. `getState()` es síncrono y siempre está al día. */
export function getCartSnapshot(): CartState {
  return cartStore.getState();
}
