import Link from "next/link";

import { GlassCard } from "@/components/glass/glass-card";

/**
 * Página no encontrada (404). Mismo tono de marca que el resto del sitio,
 * en vez de la página genérica de Next.js.
 */
export default function NotFoundPage() {
  return (
    <main className="bg-bone-1">
      <div className="container-ac flex min-h-[60vh] items-center justify-center py-section">
        <GlassCard contentClassName="px-8 py-20 text-center">
          <p className="eyebrow">404</p>
          <h1 className="mt-5 text-heading">No encontramos esta página</h1>
          <p className="mx-auto mt-4 max-w-sm text-ash">
            Es posible que la pieza se haya movido o ya no esté en el catálogo.
          </p>
          <div className="mt-9 flex justify-center">
            <Link
              href="/tienda"
              className="border border-ink bg-ink px-5 py-3 font-mono text-xs tracking-[0.14em] text-bone uppercase hover:bg-transparent hover:text-ink"
            >
              Ver la tienda
            </Link>
          </div>
        </GlassCard>
      </div>
    </main>
  );
}
