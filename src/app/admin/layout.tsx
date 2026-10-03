import type { Metadata } from "next";

/**
 * Raíz del panel
 * ============================================================================
 * Server Component padre de todas las rutas `/admin/*`. No protege nada aquí:
 * la protección vive en `proxy.ts` y en `(panel)/layout.tsx`, y confundir las
 * tres capas es el fallo más caro de un panel.
 *
 * LO ÚNICO QUE PONE ESTE ARCHIVO
 * `metadata.robots` para que ninguna ruta del panel se indexe, y el `title`
 * corto. El layout no valida sesión porque el login también es `/admin/...`:
 * si lo hiciera aquí, se bloquearía a sí mismo.
 */
export const metadata: Metadata = {
  title: {
    default: "Panel AC",
    template: "%s — Panel AC",
  },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
