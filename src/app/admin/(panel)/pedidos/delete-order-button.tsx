"use client";

import { deleteOrderAction } from "./actions";

export function DeleteOrderButton({ orderId, returnTo }: { orderId: string; returnTo: string }) {
  return (
    <form action={deleteOrderAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        onClick={(event) => {
          if (!confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) {
            event.preventDefault();
          }
        }}
        className="border border-danger/40 px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] text-danger uppercase transition-colors hover:bg-danger hover:text-bone"
      >
        Eliminar
      </button>
    </form>
  );
}
