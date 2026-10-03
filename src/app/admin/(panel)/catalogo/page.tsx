import { listAdminProducts } from "@/lib/data/admin-catalog-repository";
import { updateProductStatusAction, updateVariantAction } from "./actions";
import { formatMoney } from "@/lib/domain/money";
import type { ProductStatus } from "@/lib/domain/types";

const STATUS_OPTIONS: ProductStatus[] = ["draft", "published", "archived"];

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

/**
 * Catálogo
 * ============================================================================
 * Fase 3. Muestra productos con sus variantes. Desde aquí se edita stock,
 * precio y estado de publicación. La creación/edición de productos completos
 * queda para una fase posterior porque toca datos más sensibles que el precio.
 */
export default async function AdminCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const products = await listAdminProducts();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-heading text-ink">Catálogo</h2>
        <p className="mt-2 max-w-xl text-ash">
          Edita stock, precio y estado de publicación de cada variante. Los cambios aparecen en la
          tienda tras revalidar ISR.
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

      <div className="flex flex-col gap-8">
        {products.map((product) => (
          <section key={product.id} className="border border-line p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-mono text-sm text-ink">{product.name}</h3>
                <p className="font-mono text-[11px] tracking-[0.14em] text-ash-2 uppercase">
                  {product.slug} · {STATUS_LABELS[product.status]}
                </p>
              </div>

              <form action={updateProductStatusAction} className="flex items-center gap-3">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="returnTo" value="/admin/catalogo" />
                <select
                  name="status"
                  defaultValue={product.status}
                  className="border border-line bg-transparent px-3 py-2 text-sm text-ink"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="border border-ink bg-ink px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
                >
                  Guardar
                </button>
              </form>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              {product.variants.map((variant) => (
                <form
                  key={variant.id}
                  action={updateVariantAction}
                  className="grid gap-4 border-t border-line pt-4 sm:grid-cols-[1fr_120px_140px_auto]"
                >
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input type="hidden" name="returnTo" value="/admin/catalogo" />

                  <div>
                    <p className="font-mono text-xs text-ink">{variant.sku}</p>
                    <p className="text-sm text-ash">
                      {Object.values(variant.optionValues).join(" · ")}
                    </p>
                  </div>

                  <label className="flex flex-col gap-1 text-xs text-ash">
                    Stock
                    <input
                      name="stock"
                      type="number"
                      min="0"
                      defaultValue={variant.stock}
                      className="w-full border border-line bg-transparent px-2 py-1.5 text-ink"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-xs text-ash">
                    Precio
                    <input
                      name="price"
                      type="text"
                      defaultValue={(variant.priceCents / 100).toFixed(2)}
                      className="w-full border border-line bg-transparent px-2 py-1.5 text-ink"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="border border-ink bg-ink px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
                    >
                      Guardar
                    </button>
                  </div>

                  <p className="text-xs text-ash-2 sm:col-span-4">
                    Precio actual: {formatMoney(variant.priceCents)}
                  </p>
                </form>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
