import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

/**
 * Resumen del panel
 * ============================================================================
 * Página inicial de `/admin`. Hoy solo saluda y ofrece atajos: los datos de
 * pedidos, catálogo y ajustes se montarán en las fases siguientes. No hay
 * contadores ficticios ni gráficos que no pinten nada —un 0 sin pedidos sería
 * un error visual, no un dato.
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSessionFromRequest();

  return (
    <div className="max-w-2xl">
      <h2 className="text-heading text-ink">Bienvenida{session ? `, ${session.name}` : ""}.</h2>
      <p className="mt-3 text-ash">
        Usa el menú de arriba para revisar pedidos, el catálogo y los ajustes del sitio. Cualquier
        cambio que hagas quedará en la bitácora.
      </p>
    </div>
  );
}
