import { redirect } from "next/navigation";
import Link from "next/link";

import { logoutAction } from "@/app/admin/login/actions";
import { Button } from "@/components/ui/button-client";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

/**
 * Guardián del panel
 * ============================================================================
 * Layout del route group `(panel)`. Es la segunda capa de protección: `proxy.ts`
 * filtra por cookie, y este layout vuelve a comprobar la sesión contra D1.
 *
 * NO ES DECORATIVO
 * El proxy no valida el token, solo lo ve. Una cookie manipulada con un token
 * que no está en `session_tokens`, o de una cuenta desactivada, pasaría el proxy
 * y aquí moriría. Por eso este layout es obligatorio aunque el proxy exista.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSessionFromRequest();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="container-ac pt-16 pb-section lg:pt-20">
      <header className="flex items-start justify-between gap-6 pb-10">
        <div>
          <span className="eyebrow">AC · Panel</span>
          <h1 className="mt-4 text-display">Administración</h1>
          <p className="mt-4 max-w-lg text-lead text-ash">
            Sesión como <span className="font-mono text-ink">{session.email}</span> ·{" "}
            <span className="font-mono text-ash-2">{session.role}</span>
          </p>
          <nav className="mt-6 flex flex-wrap gap-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
            <Link href="/admin" className="hover:text-ink">
              Resumen
            </Link>
            <Link href="/admin/pedidos" className="hover:text-ink">
              Pedidos
            </Link>
            <Link href="/admin/catalogo" className="hover:text-ink">
              Catálogo
            </Link>
            <Link href="/admin/colecciones" className="hover:text-ink">
              Colecciones
            </Link>
            <Link href="/admin/etiquetas" className="hover:text-ink">
              Etiquetas
            </Link>
            <Link href="/admin/ajustes" className="hover:text-ink">
              Ajustes
            </Link>
          </nav>
        </div>

        <form action={logoutAction}>
          <Button variant="secondary" size="sm" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </header>

      <section>{children}</section>
    </div>
  );
}
