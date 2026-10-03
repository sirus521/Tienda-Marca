import { notFound } from "next/navigation";
import Link from "next/link";

import { getOrderById, getOrderStatusHistory } from "@/lib/data/admin-order-repository";
import { updateOrderStatusAction } from "../actions";
import { DeleteOrderButton } from "../delete-order-button";
import { formatMoney } from "@/lib/domain/money";
import type { OrderStatus } from "@/lib/domain/types";

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Nuevo",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_OPTIONS: OrderStatus[] = ["new", "confirmed", "shipped", "delivered", "cancelled"];

/**
 * Detalle de pedido
 * ============================================================================
 * Pantalla para revisar qué compró la persona, cuánto debe, dónde lo recibe y
 * qué pasó con el stock. El cambio de estado va a una Server Action porque es
 * una decisión de negocio, no un render.
 */
export default async function PedidoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const order = await getOrderById(id);
  if (!order) notFound();

  const history = await getOrderStatusHistory(id);

  return (
    <div className="flex flex-col gap-10">
      <nav className="font-mono text-xs tracking-[0.14em] text-ash uppercase">
        <Link href="/admin/pedidos" className="hover:text-ink">
          ← Pedidos
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <p className="font-mono text-sm text-ash">{order.folio}</p>
        <h2 className="text-display text-ink">Pedido {formatMoney(order.totals.totalCents)}</h2>
        <p className="text-ash">
          Estado actual: <span className="font-mono text-ink">{STATUS_LABELS[order.status]}</span>
        </p>
      </header>

      {error ? (
        <p role="alert" className="border border-danger px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {ok ? (
        <p role="status" className="border border-success px-4 py-3 text-sm text-success">
          {ok}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">Cliente</h3>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  Nombre
                </dt>
                <dd className="text-ink">{order.customer.fullName}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  Teléfono
                </dt>
                <dd className="text-ink">{order.customer.phone}</dd>
              </div>
              {order.customer.email ? (
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                    Correo
                  </dt>
                  <dd className="text-ink">{order.customer.email}</dd>
                </div>
              ) : null}
              <div>
                <dt className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  Entrega
                </dt>
                <dd className="text-ink">
                  {order.customer.postalCode} {order.customer.city}, {order.customer.state}
                </dd>
              </div>
              {order.customer.notes ? (
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                    Notas
                  </dt>
                  <dd className="text-ink">{order.customer.notes}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section>
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
              Artículos
            </h3>
            <div className="flex flex-col divide-y divide-line border border-line">
              {order.items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-ink">{item.productName}</p>
                    <p className="text-sm text-ash">
                      {item.variantSku} · {Object.values(item.optionValues).join(" / ")}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-ink">
                    {item.quantity} × {formatMoney(item.unitPriceCents)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section className="border border-line p-5">
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">Total</h3>
            <p className="font-display text-heading text-ink">
              {formatMoney(order.totals.totalCents)}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
              {order.deliveryMethod === "pickup" ? "Recoger" : "Envío"} ·{" "}
              {order.paymentMethod === "mercadopago" ? "Mercado Pago" : "Transferencia o WhatsApp"}
            </p>
          </section>

          <section className="border border-line p-5">
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
              Cambiar estado
            </h3>
            <form action={updateOrderStatusAction} className="flex flex-col gap-4">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="returnTo" value={`/admin/pedidos/${order.id}`} />
              <label className="flex flex-col gap-2 text-sm text-ash">
                Estado
                <select
                  name="status"
                  defaultValue={order.status}
                  className="w-full border border-line bg-transparent px-3 py-2.5 text-ink"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {STATUS_LABELS[option]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-ash">
                Nota (opcional)
                <textarea
                  name="note"
                  rows={3}
                  className="w-full border border-line bg-transparent px-3 py-2.5 text-ink placeholder:text-ash-2"
                  placeholder="Ej: Canceló porque cambió de talla"
                />
              </label>

              <button
                type="submit"
                className="border border-ink bg-ink px-4 py-3 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
              >
                Guardar
              </button>
            </form>
          </section>

          <section className="border border-line p-5">
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
              Acciones rápidas
            </h3>
            <div className="flex flex-col gap-3">
              {order.status !== "delivered" && order.status !== "cancelled" ? (
                <form action={updateOrderStatusAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="status" value="delivered" />
                  <input type="hidden" name="returnTo" value={`/admin/pedidos/${order.id}`} />
                  <button
                    type="submit"
                    className="w-full border border-ink bg-ink px-4 py-3 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
                  >
                    Marcar como entregado
                  </button>
                </form>
              ) : null}

              <DeleteOrderButton orderId={order.id} returnTo="/admin/pedidos" />
            </div>
          </section>

          <section className="border border-line p-5">
            <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
              Historial
            </h3>
            <ol className="flex flex-col gap-3 text-sm text-ash">
              {history.map((entry) => (
                <li key={entry.id}>
                  <span className="font-mono text-ink">{entry.toStatus}</span>
                  {entry.fromStatus ? ` desde ${entry.fromStatus}` : ""}{" "}
                  <span className="text-ash-2">· {entry.changedBy ?? "sistema"}</span>
                  {entry.note ? <p className="mt-1 text-ash">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
