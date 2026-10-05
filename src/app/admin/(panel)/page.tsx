import Link from "next/link";

import { AdminStatCard } from "@/components/admin/stat-card";
import { GlassPanel } from "@/components/admin/glass-panel";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getCatalogStats } from "@/lib/data/admin-catalog-repository";
import { getOrderStats, getRevenueStats } from "@/lib/data/admin-order-repository";
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
  const orderStats = await getOrderStats();
  const catalogStats = await getCatalogStats();
  const revenue = await getRevenueStats(7);

  const sections = [
    {
      href: "/admin/pedidos",
      title: "Pedidos",
      description: "Revisa pedidos, cambia estado y elimina registros.",
    },
    {
      href: "/admin/catalogo",
      title: "Catálogo",
      description: "Agrega, edita stock/precio y elimina productos.",
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
      <GlassPanel as="header" hover={false} glassClassName="p-6 lg:p-8">
        <h2 className="text-heading text-ink">Bienvenida{session ? `, ${session.name}` : ""}.</h2>
        <p className="mt-3 max-w-xl text-ash">
          Panel de operación de AC. Los cambios importantes quedan registrados en auditoría.
        </p>
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Pedidos"
          value={orderStats.total}
          detail={`${orderStats.new} nuevos · ${orderStats.delivered} entregados`}
          delay={0}
        />
        <AdminStatCard
          label="Productos"
          value={catalogStats.totalProducts}
          detail={`${catalogStats.publishedProducts} publicados · ${catalogStats.draftProducts} borradores`}
          delay={0.08}
        />
        <AdminStatCard
          label="Variantes"
          value={catalogStats.totalVariants}
          detail={`${catalogStats.lowStockVariants} con stock bajo`}
          delay={0.16}
          accent="bronze"
        />
        <AdminStatCard
          label="Cancelados"
          value={orderStats.cancelled}
          detail="Pedidos cancelados"
          delay={0.24}
          accent="bronze"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard
          label="Ingresos"
          value={Math.round(revenue.totalRevenueCents / 100)}
          detail="Pedidos entregados (MXN)"
          delay={0.24}
          accent="bronze"
        />
        <AdminStatCard
          label="Ticket promedio"
          value={Math.round(revenue.averageTicketCents / 100)}
          detail="MXN por pedido entregado"
          delay={0.32}
          accent="bronze"
        />
      </div>

      <RevenueChart days={revenue.byDay} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, index) => (
          <Link key={section.href} href={section.href} className="block h-full">
            <GlassPanel delay={0.3 + index * 0.06} glassClassName="h-full p-5">
              <h3 className="font-mono text-sm text-ink">{section.title}</h3>
              <p className="mt-2 text-sm text-ash">{section.description}</p>
            </GlassPanel>
          </Link>
        ))}
      </div>
    </div>
  );
}
