import Link from "next/link";

import { listOrders } from "@/lib/data/admin-order-repository";
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
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { status, error } = await searchParams;
  const filter =
    typeof status === "string" && FILTERS.includes(status as OrderStatus | "all")
      ? (status as OrderStatus | "all")
      : "all";

  const orders = await listOrders({ status: filter });

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

      {error ? (
        <p role="alert" className="mb-6 border border-danger px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {orders.length === 0 ? (
        <p className="text-ash">No hay pedidos en esta vista.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line border border-line">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos/${order.id}`}
              className="flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-bone"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-ink">{order.folio}</p>
                <p className="truncate text-sm text-ash">{order.customerFullName}</p>
              </div>

              <div className="text-right">
                <p className="font-mono text-sm text-ink">{formatMoney(order.totalCents)}</p>
                <p className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  {order.itemCount} artículo{order.itemCount === 1 ? "" : "s"} ·{" "}
                  {STATUS_LABELS[order.status]}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
