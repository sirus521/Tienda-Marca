import type { Metadata } from "next";

import { CartPageContent } from "@/components/cart/cart-page-content";

/**
 * Bolsa
 * ============================================================================
 * Página de la bolsa. Es un Server Component que solo aporta metadatos y
 * estructura: el contenido vive en `CartPageContent`, que es cliente porque
 * lee el store de Zustand y pinta la bolsa desde `localStorage`.
 *
 * NO SE INDEXA
 * `/carrito` está en `site.noIndexPaths`. Que un buscador indexe una bolsa
 * vacía no aporta nada y la enlaza en cada preview de enlace. Se marca aquí
 * con `robots`, que es la vía que Next entiende de forma nativa, en vez de
 * añadir un middleware que tenga que mantener una lista de rutas.
 */
export const metadata: Metadata = {
  title: "Tu bolsa",
  description: "Revisa los artículos que elegiste antes de confirmar tu pedido.",
  alternates: { canonical: "/carrito" },
  robots: { index: false, follow: false },
};

export default function CarritoPage() {
  return (
    <div className="container-ac pt-16 pb-section lg:pt-20">
      {/* ---------------- Encabezado ---------------- */}
      <header className="pb-12">
        <span className="eyebrow">Tu bolsa</span>
        <h1 className="mt-5 text-display">La bolsa</h1>
        <p className="mt-6 max-w-lg text-lead text-ash">
          Todo lo que elegiste, con sus tallas. Puedes cambiar cantidades antes de continuar.
        </p>
      </header>

      <CartPageContent />
    </div>
  );
}
