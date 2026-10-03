import Link from "next/link";

import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

/**
 * Resumen del panel
 * ============================================================================
 * Página inicial de `/admin`. No muestra contadores inventados: las secciones ya
 * existen y este resumen solo te lleva a ellas. Si una sección no tiene datos,
 * su propia vista lo dice.
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSessionFromRequest();

  const sections = [
    {
      href: "/admin/pedidos",
      title: "Pedidos",
      description: "Revisa pedidos nuevos, confirmados y enviados.",
    },
    {
      href: "/admin/catalogo",
      title: "Catálogo",
      description: "Edita stock, precio y estado de publicación.",
    },
    {
      href: "/admin/colecciones",
      title: "Colecciones",
      description: "Publica o destaca colecciones.",
    },
    {
      href: "/admin/etiquetas",
      title: "Etiquetas",
      description: "Crea y organiza tags del catálogo.",
    },
    {
      href: "/admin/ajustes",
      title: "Ajustes y auditoría",
      description: "Configura ajustes y revisa cambios recientes.",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-heading text-ink">Bienvenida{session ? `, ${session.name}` : ""}.</h2>
        <p className="mt-3 max-w-xl text-ash">
          Panel de operación de AC. Los cambios importantes quedan registrados en auditoría.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="border border-line p-5 transition-colors hover:border-line-strong hover:bg-bone"
          >
            <h3 className="font-mono text-sm text-ink">{section.title}</h3>
            <p className="mt-2 text-sm text-ash">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
