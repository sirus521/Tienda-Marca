import Link from "next/link";

import { redirect } from "next/navigation";

import { getAdminProductDetail } from "@/lib/data/admin-catalog-repository";
import { getAdminSessionFromRequest } from "@/lib/server/admin-session";
import { formatMoney } from "@/lib/domain/money";
import type { ProductStatus } from "@/lib/domain/types";

import {
  addOptionAction,
  addOptionValueAction,
  addProductImageAction,
  addVariantAction,
  deleteProductImageAction,
  deleteVariantAction,
  removeOptionAction,
  removeOptionValueAction,
  setPrimaryImageAction,
  updateProductAction,
  updateVariantAction,
  updateVariantDetailsAction,
} from "../../actions";

const STATUS_OPTIONS: ProductStatus[] = ["draft", "published", "archived"];
const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

export default async function AdminEditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const session = await getAdminSessionFromRequest();
  if (!session) redirect("/admin/login");

  const { id } = await params;
  const { ok, error } = await searchParams;
  const product = await getAdminProductDetail(id);
  if (!product) redirect(`/admin/catalogo?error=${encodeURIComponent("Producto no encontrado.")}`);

  const isOwner = session.role === "owner";
  const returnTo = `/admin/catalogo/${id}/editar`;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/admin/catalogo"
          className="font-mono text-[11px] tracking-[0.14em] text-ash uppercase hover:text-ink"
        >
          ← Catálogo
        </Link>
        <h2 className="text-heading text-ink">Editar: {product.name}</h2>
        <p className="max-w-xl text-ash">
          {product.slug} · {STATUS_LABELS[product.status]}
          {isOwner ? " · owner" : " · editor"}
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

      {/* -------- Datos del producto -------- */}
      <section className="border border-line p-5">
        <h3 className="mb-4 font-mono text-sm tracking-[0.14em] text-ink uppercase">Datos</h3>
        <form action={updateProductAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="flex flex-col gap-1 text-xs text-ash">
            Nombre
            <input
              name="name"
              required
              defaultValue={product.name}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            Slug
            <input
              name="slug"
              defaultValue={product.slug}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            Categoría
            <input
              name="category"
              defaultValue={product.category ?? ""}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            Tags (coma)
            <input
              name="tags"
              defaultValue={product.tags.join(", ")}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-ash sm:col-span-2">
            <input
              name="isFeatured"
              type="checkbox"
              defaultChecked={product.isFeatured}
              disabled={!isOwner}
              className="h-4 w-4"
            />
            Destacar en portada {isOwner ? "" : "(solo owner)"}
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash sm:col-span-2">
            Descripción corta
            <input
              name="shortDescription"
              defaultValue={product.shortDescription ?? ""}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash sm:col-span-2">
            Descripción larga
            <textarea
              name="description"
              rows={4}
              defaultValue={product.description ?? ""}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            SEO título
            <input
              name="seoTitle"
              defaultValue={product.seoTitle ?? ""}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            SEO descripción
            <input
              name="seoDescription"
              defaultValue={product.seoDescription ?? ""}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-ash">
            Estado
            <select
              name="status"
              defaultValue={product.status}
              disabled={!isOwner}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end sm:col-span-2">
            <button
              type="submit"
              className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </section>

      {/* -------- Opciones (ejes: Talla, Color...) -------- */}
      <section className="border border-line p-5">
        <h3 className="mb-4 font-mono text-sm tracking-[0.14em] text-ink uppercase">
          Opciones (ejes de variación)
        </h3>

        <form action={addOptionAction} className="mb-6 flex items-end gap-3">
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="flex flex-1 flex-col gap-1 text-xs text-ash">
            Nuevo eje (ej. Talla, Color)
            <input
              name="name"
              placeholder="Talla"
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase">
            Agregar eje
          </button>
        </form>

        {product.options.map((option) => {
          const values = product.optionValues.filter((v) => v.optionId === option.id);
          return (
            <div key={option.id} className="mb-6 border-t border-line pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-mono text-xs text-ink">{option.name}</p>
                <form action={removeOptionAction}>
                  <input type="hidden" name="optionId" value={option.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="font-mono text-[11px] text-danger uppercase hover:underline">
                    Quitar eje
                  </button>
                </form>
              </div>

              <ul className="mb-3 flex flex-wrap gap-2">
                {values.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-2 border border-line px-3 py-1.5 text-xs text-ink"
                  >
                    {v.hexColor ? (
                      <span className="h-3 w-3 rounded-full" style={{ background: v.hexColor }} />
                    ) : null}
                    {v.value}
                    <form action={removeOptionValueAction}>
                      <input type="hidden" name="optionValueId" value={v.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className="text-danger" aria-label={`Quitar ${v.value}`}>
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>

              <form action={addOptionValueAction} className="flex items-end gap-3">
                <input type="hidden" name="optionId" value={option.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="flex flex-col gap-1 text-xs text-ash">
                  Valor
                  <input
                    name="value"
                    placeholder="L"
                    className="border border-line bg-transparent px-3 py-2 text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ash">
                  Hex (opcional)
                  <input
                    name="hexColor"
                    placeholder="#111111"
                    className="border border-line bg-transparent px-3 py-2 text-ink"
                  />
                </label>
                <button className="border border-ink bg-ink px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone uppercase">
                  Agregar valor
                </button>
              </form>
            </div>
          );
        })}
      </section>

      {/* -------- Variantes -------- */}
      <section className="border border-line p-5">
        <h3 className="mb-4 font-mono text-sm tracking-[0.14em] text-ink uppercase">Variantes</h3>

        <form
          action={addVariantAction}
          className="mb-6 grid gap-4 sm:grid-cols-[1fr_120px_120px_100px_auto]"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="flex flex-col gap-1 text-xs text-ash">
            SKU
            <input
              name="sku"
              required
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Precio
            <input
              name="price"
              required
              placeholder="549.00"
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Stock
            <input
              name="stock"
              type="number"
              min="0"
              required
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Peso (g)
            <input
              name="weightGrams"
              type="number"
              min="0"
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>

          {product.options.map((option) => (
            <label key={option.id} className="flex flex-col gap-1 text-xs text-ash">
              {option.name}
              <select
                name={`opt_${option.name}`}
                className="border border-line bg-transparent px-3 py-2.5 text-ink"
              >
                <option value="(sin)">(sin)</option>
                {product.optionValues
                  .filter((v) => v.optionId === option.id)
                  .map((v) => (
                    <option key={v.id} value={v.value}>
                      {v.value}
                    </option>
                  ))}
              </select>
            </label>
          ))}

          <div className="flex items-end">
            <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase">
              Agregar variante
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-4">
          {product.variants.map((variant) => (
            <div key={variant.id} className="border-t border-line pt-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_110px_110px_140px_auto]">
                <div>
                  <p className="font-mono text-xs text-ink">{variant.sku}</p>
                  <p className="text-sm text-ash">
                    {Object.values(variant.optionValues).join(" · ") || "—"}
                  </p>
                </div>

                <form action={updateVariantAction} id={`upd-${variant.id}`}>
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <div className="flex items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-ash">
                      Stock
                      <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue={variant.stock}
                        className="w-[90px] border border-line bg-transparent px-2 py-1.5 text-ink"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-ash">
                      Precio
                      <input
                        name="price"
                        type="text"
                        defaultValue={(variant.priceCents / 100).toFixed(2)}
                        disabled={!isOwner}
                        className="w-[90px] border border-line bg-transparent px-2 py-1.5 text-ink"
                      />
                      {!isOwner ? <span className="text-[10px] text-ash-2">solo owner</span> : null}
                    </label>
                    <button
                      type="submit"
                      className="border border-ink bg-ink px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone uppercase"
                    >
                      Guardar
                    </button>
                  </div>
                </form>

                <form action={deleteVariantAction}>
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <button className="self-end border border-danger/40 px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-danger uppercase hover:bg-danger hover:text-bone">
                    Quitar
                  </button>
                </form>
              </div>

              <p className="mt-2 text-xs text-ash-2">
                Precio actual: {formatMoney(variant.priceCents)}
              </p>

              <form
                action={updateVariantDetailsAction}
                className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input type="hidden" name="variantId" value={variant.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="flex flex-col gap-1 text-xs text-ash">
                  Peso (g)
                  <input
                    name="weightGrams"
                    type="number"
                    min="0"
                    defaultValue={variant.weightGrams ?? ""}
                    className="border border-line bg-transparent px-2 py-1.5 text-ink"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-ash">
                  Imagen (ID)
                  <input
                    name="imageId"
                    defaultValue={variant.imageId ?? ""}
                    placeholder="(vacío = foto del producto)"
                    className="border border-line bg-transparent px-2 py-1.5 text-ink"
                  />
                </label>
                <button
                  type="submit"
                  className="border border-line px-3 py-2 font-mono text-[11px] text-ink uppercase"
                >
                  Guardar detalles
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      {/* -------- Imágenes -------- */}
      <section className="border border-line p-5">
        <h3 className="mb-4 font-mono text-sm tracking-[0.14em] text-ink uppercase">Imágenes</h3>

        <form
          action={addProductImageAction}
          encType="multipart/form-data"
          className="mb-6 flex flex-col gap-3 sm:max-w-md"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="flex flex-col gap-1 text-xs text-ash">
            Archivo (JPG/PNG/WebP/AVIF/GIF, máx 5 MB)
            <input
              name="file"
              type="file"
              accept="image/*"
              required
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Texto alternativo
            <input
              name="alt"
              placeholder="Playera oversize negro"
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase">
            Subir imagen
          </button>
        </form>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {product.images.map((image) => (
            <div key={image.id} className="border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt} className="aspect-square w-full object-cover" />
              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-ash-2">
                  {image.isPrimary ? "PRINCIPAL" : ""}
                </span>
                <div className="flex gap-2">
                  <form action={setPrimaryImageAction}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="font-mono text-[10px] text-ink uppercase underline">
                      Principal
                    </button>
                  </form>
                  <form action={deleteProductImageAction}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button className="font-mono text-[10px] text-danger uppercase underline">
                      Borrar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
