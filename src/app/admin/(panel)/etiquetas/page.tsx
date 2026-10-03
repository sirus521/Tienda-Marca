import { listAdminTags } from "@/lib/data/admin-taxonomy-repository";
import { createTagAction, deleteTagAction } from "../colecciones/actions";

/**
 * Etiquetas
 * ============================================================================
 * Lista, crea y borra tags. No asigna etiquetas a productos desde aquí: eso
 * pasaría por el editor de catálogo, que queda para una fase posterior.
 */
export default async function AdminEtiquetasPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const tags = await listAdminTags();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-heading text-ink">Etiquetas</h2>
        <p className="mt-2 max-w-xl text-ash">
          Gestiona los tags disponibles para el catálogo. Cada tag puede usarse luego para filtrar
          en `/tienda`.
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

      <section className="border border-line p-5">
        <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
          Nueva etiqueta
        </h3>
        <form action={createTagAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="returnTo" value="/admin/etiquetas" />
          <label className="flex flex-1 flex-col gap-1 text-xs text-ash">
            Nombre
            <input
              name="name"
              type="text"
              required
              className="w-full border border-line bg-transparent px-3 py-2.5 text-ink placeholder:text-ash-2"
              placeholder="Ej: Oversize"
            />
          </label>
          <button
            type="submit"
            className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
          >
            Crear
          </button>
        </form>
      </section>

      <section>
        <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
          Etiquetas existentes
        </h3>
        {tags.length === 0 ? (
          <p className="text-ash">No hay etiquetas.</p>
        ) : (
          <div className="grid gap-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between border border-line px-4 py-3"
              >
                <div>
                  <p className="font-mono text-sm text-ink">{tag.name}</p>
                  <p className="text-xs text-ash-2">
                    {tag.slug} · {tag.productCount} producto{tag.productCount === 1 ? "" : "s"}
                  </p>
                </div>

                <form action={deleteTagAction}>
                  <input type="hidden" name="id" value={tag.id} />
                  <input type="hidden" name="returnTo" value="/admin/etiquetas" />
                  <button
                    type="submit"
                    className="border border-danger px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-danger uppercase transition-colors hover:bg-danger hover:text-bone"
                  >
                    Borrar
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
