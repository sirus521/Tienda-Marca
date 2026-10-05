import { listCustomers } from "@/lib/data/admin-order-repository";
import { formatMoney } from "@/lib/domain/money";

export const dynamic = "force-dynamic";

/**
 * Clientes
 * ============================================================================
 * Se deriva de los pedidos: cada `orders` guarda el teléfono y nombre del
 * cliente, así que no hace falta una tabla `customers` para esta tienda.
 */
export default async function AdminClientesPage() {
  const customers = await listCustomers();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-heading text-ink">Clientes</h2>
        <p className="mt-2 max-w-xl text-ash">
          Personas que han pedido, ordenadas por actividad reciente.
        </p>
      </header>

      {customers.length === 0 ? (
        <p className="text-ash">Aún no hay clientes.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line border border-line">
          {customers.map((customer) => (
            <div
              key={customer.phone}
              className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-mono text-sm text-ink">{customer.fullName}</p>
                <p className="text-sm text-ash">{customer.phone}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-ink">{formatMoney(customer.totalCents)}</p>
                <p className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  {customer.orderCount} pedido{customer.orderCount === 1 ? "" : "s"} ·{" "}
                  {customer.lastOrderAt.slice(0, 10)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
