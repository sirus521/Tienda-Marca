import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createCoupon, deleteCoupon, listCoupons } from "@/lib/data/coupon-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";

async function createCouponAction(formData: FormData): Promise<void> {
  "use server";
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const code = formData.get("code");
  const type = formData.get("type") === "fixed" ? "fixed" : "percent";
  const valueRaw = formData.get("value");
  const value = Number(valueRaw);
  const expiresAt = formData.get("expiresAt");

  const result = await createCoupon({
    code: typeof code === "string" ? code : "",
    type,
    value: Number.isFinite(value) ? value : 0,
    expiresAt: typeof expiresAt === "string" && expiresAt.trim() !== "" ? expiresAt : null,
  });

  revalidatePath("/admin/cupones");
  redirect(`/admin/cupones${result.ok ? "?ok=1" : `?error=${encodeURIComponent(result.error)}`}`);
}

async function deleteCouponAction(formData: FormData): Promise<void> {
  "use server";
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const id = formData.get("id");
  if (typeof id === "string") await deleteCoupon(id);
  revalidatePath("/admin/cupones");
}

export default async function AdminCuponesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const coupons = await listCoupons();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-heading text-ink">Cupones</h2>
        <p className="mt-2 max-w-xl text-ash">
          Códigos de descuento que el cliente escribe al finalizar su compra.
        </p>
      </header>

      {error ? (
        <p role="alert" className="border border-danger px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="border border-success px-4 py-3 text-sm text-success">
          Cambio guardado.
        </p>
      ) : null}

      <form action={createCouponAction} className="grid max-w-md gap-4 border border-line p-5">
        <h3 className="font-mono text-sm text-ink uppercase">Crear cupón</h3>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Código
          <input
            name="code"
            required
            placeholder="OTO20"
            className="border border-line bg-transparent px-3 py-2.5 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Tipo
          <select
            name="type"
            defaultValue="percent"
            className="border border-line bg-transparent px-3 py-2.5 text-ink"
          >
            <option value="percent">Porcentaje del total</option>
            <option value="fixed">Monto fijo (centavos)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Valor
          <input
            name="value"
            type="number"
            min="1"
            required
            placeholder="20"
            className="border border-line bg-transparent px-3 py-2.5 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ash">
          Válido hasta (opcional)
          <input
            name="expiresAt"
            type="date"
            className="border border-line bg-transparent px-3 py-2.5 text-ink"
          />
        </label>
        <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase">
          Crear
        </button>
      </form>

      <div className="flex flex-col divide-y divide-line border border-line">
        {coupons.length === 0 ? (
          <p className="px-4 py-4 text-ash">No hay cupones.</p>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between px-4 py-4">
              <div>
                <p className="font-mono text-sm text-ink">{coupon.code}</p>
                <p className="text-xs text-ash-2">
                  {coupon.type === "percent"
                    ? `${coupon.value}%`
                    : `$${(coupon.value / 100).toFixed(2)} menos`}
                  {coupon.expiresAt ? ` · vence ${coupon.expiresAt.slice(0, 10)}` : ""}
                  {!coupon.active ? " · inactivo" : ""}
                </p>
              </div>
              <form action={deleteCouponAction}>
                <input type="hidden" name="id" value={coupon.id} />
                <button className="font-mono text-[11px] text-danger uppercase hover:underline">
                  Eliminar
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
