import { listAdminCollections } from "@/lib/data/admin-taxonomy-repository";
import { updateCollectionFlagsAction } from "./actions";

/**
 * Colecciones
 * ============================================================================
 * Permite ver colecciones y cambiar si están publicadas o destacadas. No
 * incluye edición de productos dentro de la colección: eso queda para una
 * fase que toque editorial.
 */
export default async function AdminColeccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const collections = await listAdminCollections();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-heading text-ink">Colecciones</h2>
        <p className="mt-2 max-w-xl text-ash">
          Listado de colecciones con su estado. Desde aquí se activa, desactiva o destaca una
          colección en la tienda.
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

      {collections.length === 0 ? (
        <p className="text-ash">No hay colecciones.</p>
      ) : (
        <div className="grid gap-4">
          {collections.map((collection) => (
            <section key={collection.id} className="border border-line p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-mono text-sm text-ink">{collection.name}</h3>
                  <p className="text-sm text-ash">
                    {collection.slug} · {collection.productCount} producto
                    {collection.productCount === 1 ? "" : "s"}
                  </p>
                </div>

                <form
                  action={updateCollectionFlagsAction}
                  className="flex flex-wrap items-center gap-4"
                >
                  <input type="hidden" name="id" value={collection.id} />
                  <input type="hidden" name="returnTo" value="/admin/colecciones" />

                  <label className="flex items-center gap-2 text-sm text-ash">
                    <input
                      name="isPublished"
                      type="checkbox"
                      defaultChecked={collection.isPublished}
                      className="h-4 w-4"
                    />
                    Publicada
                  </label>

                  <label className="flex items-center gap-2 text-sm text-ash">
                    <input
                      name="isFeatured"
                      type="checkbox"
                      defaultChecked={collection.isFeatured}
                      className="h-4 w-4"
                    />
                    Destacada
                  </label>

                  <button
                    type="submit"
                    className="border border-ink bg-ink px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
                  >
                    Guardar
                  </button>
                </form>
              </div>

              {collection.description ? (
                <p className="mt-3 max-w-2xl text-sm text-ash">{collection.description}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
