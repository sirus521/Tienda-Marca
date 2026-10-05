import Link from "next/link";

import { getOrderStats, listOrders } from "@/lib/data/admin-order-repository";
import { updateOrderStatusAction } from "./actions";
import { DeleteOrderButton } from "./delete-order-button";
import { formatMoney } from "@/lib/domain/money";
import type { OrderStatus } from "@/lib/domain/types";

const STATUS_LABELS: Record<OrderStatus | "all", string> = {
  all: "Todos",
  new: "Nuevos",
  confirmed: "Confirmados",
  shipped: "Enviados",
  delivered: "Entregados",
  cancelled: "Cancelados",
};

const FILTERS = Object.keys(STATUS_LABELS) as (OrderStatus | "all")[];

/**
 * Lista de pedidos
 * ============================================================================
 * Vista principal de `/admin`. Muestra solo lo que un admin necesita para
 * decidir: folio, cliente, total, artículos y estado. El detalle se abre desde
 * aquí.
 */
export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; error?: string }>;
}) {
  const { status, q, page, error } = await searchParams;
  const filter =
    typeof status === "string" && FILTERS.includes(status as OrderStatus | "all")
      ? (status as OrderStatus | "all")
      : "all";

  const pageSize = 20;
  const currentPage = Math.max(1, Number(page) || 1);
  const orders = await listOrders({
    status: filter,
    q,
    limit: pageSize + 1,
    offset: (currentPage - 1) * pageSize,
  });
  const hasNext = orders.length > pageSize;
  const visibleOrders = hasNext ? orders.slice(0, pageSize) : orders;
  const stats = await getOrderStats();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
        <h2 className="text-heading text-ink">Pedidos</h2>
        <div className="flex flex-wrap gap-3 font-mono text-[11px] tracking-[0.14em] uppercase">
          {FILTERS.map((key) => (
            <Link
              key={key}
              href={key === "all" ? "/admin/pedidos" : `/admin/pedidos?status=${key}`}
              className={`border px-3 py-1.5 transition-colors ${
                filter === key
                  ? "border-ink text-ink"
                  : "border-line text-ash hover:border-line-strong hover:text-ink"
              }`}
            >
              {STATUS_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pb-8 font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
        <span>Total: {stats.total}</span>
        <span>Nuevos: {stats.new}</span>
        <span>Confirmados: {stats.confirmed}</span>
        <span>Enviados: {stats.shipped}</span>
        <span>Entregados: {stats.delivered}</span>
        <span>Cancelados: {stats.cancelled}</span>
        <a
          href={`/api/admin/export?resource=orders${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          className="ml-auto"
        >
          Exportar CSV
        </a>
      </div>

      <form method="GET" action="/admin/pedidos" className="flex gap-3 pb-8">
        {filter !== "all" ? <input type="hidden" name="status" value={filter} /> : null}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por folio, nombre o teléfono…"
          aria-label="Buscar pedido"
          className="w-full max-w-sm border border-line bg-transparent px-3 py-2.5 text-ink placeholder:text-ash-2"
        />
        <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase">
          Buscar
        </button>
      </form>

      {error ? (
        <p role="alert" className="mb-6 border border-danger px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {visibleOrders.length === 0 ? (
        <p className="text-ash">No hay pedidos en esta vista.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line border border-line">
          {visibleOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-bone sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/admin/pedidos/${order.id}`} className="min-w-0 flex-1">
                <p className="font-mono text-sm text-ink">{order.folio}</p>
                <p className="truncate text-sm text-ash">{order.customerFullName}</p>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <div className="text-right">
                  <p className="font-mono text-sm text-ink">{formatMoney(order.totalCents)}</p>
                  <p className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                    {order.itemCount} artículo{order.itemCount === 1 ? "" : "s"} ·{" "}
                    {STATUS_LABELS[order.status]}
                  </p>
                </div>

                {order.status !== "delivered" && order.status !== "cancelled" ? (
                  <form action={updateOrderStatusAction} className="flex items-center gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value="delivered" />
                    <input type="hidden" name="returnTo" value="/admin/pedidos" />
                    <button
                      type="submit"
                      className="border border-ink bg-ink px-3 py-1.5 font-mono text-[11px] tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
                    >
                      Entregado
                    </button>
                  </form>
                ) : null}

                <DeleteOrderButton orderId={order.id} returnTo="/admin/pedidos" />
              </div>
            </div>
          ))}
        </div>
      )}

      {currentPage > 1 || hasNext ? (
        <div className="flex items-center gap-3 pt-6 font-mono text-[11px] tracking-[0.14em] uppercase">
          {currentPage > 1 ? (
            <Link
              href={`/admin/pedidos?${filter !== "all" ? `status=${filter}&` : ""}${q ? `q=${encodeURIComponent(q)}&` : ""}page=${currentPage - 1}`}
              className="border border-line px-3 py-1.5 text-ink hover:border-ink"
            >
              ← Anterior
            </Link>
          ) : null}
          <span className="text-ash">Página {currentPage}</span>
          {hasNext ? (
            <Link
              href={`/admin/pedidos?${filter !== "all" ? `status=${filter}&` : ""}${q ? `q=${encodeURIComponent(q)}&` : ""}page=${currentPage + 1}`}
              className="border border-line px-3 py-1.5 text-ink hover:border-ink"
            >
              Siguiente →
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
