"use client";

import { deleteProductAction } from "./actions";

export function DeleteProductButton({
  productId,
  returnTo,
}: {
  productId: string;
  returnTo: string;
}) {
  return (
    <form action={deleteProductAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        onClick={(event) => {
          if (!confirm("¿Eliminar este producto? Se quitarán también sus variantes.")) {
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
