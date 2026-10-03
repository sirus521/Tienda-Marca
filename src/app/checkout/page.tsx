import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";

/**
 * Checkout
 * ============================================================================
 * Página de confirmación. Es un Server Component que aporta metadatos y el
 * armazón; el formulario es cliente porque envía la server action y muestra el
 * estado de éxito, el folio y el enlace de WhatsApp.
 *
 * NO SE INDEXA
 * Va en `site.noIndexPaths`. Un checkout en el índice de buscadores es ruido
 * y, además, expone una URL de compra vacía en cada preview de enlace.
 *
 * SIN `revalidate`
 * La página lee el carrito del navegador, no del servidor: no hay nada que
 * cachear. El contenido real llega con la server action al enviar.
 */
export const metadata: Metadata = {
  title: "Confirmar pedido",
  description: "Completa tus datos para registrar tu pedido y confirmarlo por WhatsApp.",
  alternates: { canonical: "/checkout" },
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <div className="container-ac pt-16 pb-section lg:pt-20">
      {/* ---------------- Encabezado ---------------- */}
      <header className="pb-12">
        <span className="eyebrow">Último paso</span>
        <h1 className="mt-5 text-display">Confirmar pedido</h1>
        <p className="mt-6 max-w-lg text-lead text-ash">
          Registramos tu pedido y te damos el acceso directo a WhatsApp con el detalle para
          confirmar disponibilidad, envío y forma de pago. Aquí no se cobra nada.
        </p>
      </header>

      {/* ---------------- Formulario ----------------
          El formulario ya pinta sus propios estados: bolsa vacía, error por
          campo y pantalla de éxito con el folio. */}
      <div className="max-w-2xl">
        <CheckoutForm />
      </div>
    </div>
  );
}
