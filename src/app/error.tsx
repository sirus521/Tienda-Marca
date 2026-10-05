"use client";

import { useEffect } from "react";

/**
 * Falla global de ruta. Se mantiene el tono minimalista: muestra el error al
 * operador en consola y ofrece volver a la tienda.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-bone-1">
      <div className="container-ac flex min-h-[60vh] items-center justify-center py-section">
        <div className="px-8 py-20 text-center">
          <p className="eyebrow">Error</p>
          <h1 className="mt-5 text-heading">Algo salió mal</h1>
          <p className="mx-auto mt-4 max-w-sm text-ash">
            Hubo un problema al renderizar esta página. Intenta de nuevo.
          </p>
          <button
            onClick={reset}
            className="mt-9 border border-ink bg-ink px-5 py-3 font-mono text-xs tracking-[0.14em] text-bone uppercase hover:bg-transparent hover:text-ink"
          >
            Reintentar
          </button>
        </div>
      </div>
    </main>
  );
}
