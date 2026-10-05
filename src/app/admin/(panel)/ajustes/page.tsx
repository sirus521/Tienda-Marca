import { listRecentAuditLogs, readSettings } from "@/lib/data/admin-repository";
import { getBrandConfig } from "@/lib/config/brand-runtime";
import { saveBrandSettingsAction, updateSettingsAction } from "./actions";

/**
 * Ajustes y auditoría
 * ============================================================================
 * Fase 4. Permite guardar claves de configuración como JSON y muestra la
 * bitácora reciente de acciones del panel.
 */
export default async function AdminAjustesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const settings = await readSettings<Record<string, unknown>>({});
  const auditLogs = await listRecentAuditLogs(25);
  const brandConfig = await getBrandConfig();

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h2 className="text-heading text-ink">Ajustes y auditoría</h2>
        <p className="mt-2 max-w-xl text-ash">
          Configura ajustes del sitio y revisa quién cambió qué y cuándo.
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-line p-5">
          <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
            Ajustes actuales
          </h3>
          <pre className="overflow-x-auto text-sm whitespace-pre-wrap text-ash">
            {JSON.stringify(settings, null, 2)}
          </pre>
        </div>

        <form action={updateSettingsAction} className="border border-line p-5">
          <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
            Guardar ajuste
          </h3>
          <input type="hidden" name="returnTo" value="/admin/ajustes" />

          <label className="flex flex-col gap-1 text-xs text-ash">
            Clave
            <input
              name="key"
              type="text"
              required
              className="w-full border border-line bg-transparent px-3 py-2.5 text-ink"
              placeholder="Ej: store.theme"
            />
          </label>

          <label className="mt-4 flex flex-col gap-1 text-xs text-ash">
            Valor JSON
            <textarea
              name="value"
              rows={6}
              required
              className="w-full border border-line bg-transparent px-3 py-2.5 text-ink"
              placeholder='{"mode":"dark"}'
            />
          </label>

          <button
            type="submit"
            className="mt-4 border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink"
          >
            Guardar
          </button>
        </form>
      </section>

      <section className="border border-line p-5">
        <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
          Marca y contacto
        </h3>
        <p className="mb-4 text-sm text-ash-2">
          Estos datos se usan en el pie, la lista de avisos y el mensaje de WhatsApp.
        </p>
        <form action={saveBrandSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-ash">
            WhatsApp
            <input
              name="whatsapp"
              defaultValue={brandConfig.contact.whatsapp}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Saludo de WhatsApp
            <input
              name="whatsappGreeting"
              defaultValue={brandConfig.contact.whatsappGreeting}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Correo
            <input
              name="email"
              defaultValue={brandConfig.contact.email}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Instagram
            <input
              name="instagram"
              defaultValue={brandConfig.contact.instagram}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash sm:col-span-2">
            Ubicación
            <input
              name="location"
              defaultValue={brandConfig.contact.location}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Envío gratis desde (centavos)
            <input
              name="freeShippingThresholdCents"
              type="number"
              min="0"
              defaultValue={brandConfig.commerce.freeShippingThresholdCents}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ash">
            Prefijo de pedido
            <input
              name="orderPrefix"
              defaultValue={brandConfig.commerce.orderPrefix}
              className="border border-line bg-transparent px-3 py-2.5 text-ink"
            />
          </label>
          <div className="flex items-end sm:col-span-2">
            <button className="border border-ink bg-ink px-4 py-2.5 font-mono text-xs tracking-[0.14em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink">
              Guardar marca
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="pb-4 font-mono text-xs tracking-[0.14em] text-ash uppercase">
          Auditoría reciente
        </h3>

        {auditLogs.length === 0 ? (
          <p className="text-ash">Sin movimientos recientes.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {auditLogs.map((entry) => (
              <div key={entry.id} className="border border-line px-4 py-3">
                <p className="font-mono text-sm text-ink">{entry.action}</p>
                <p className="text-sm text-ash">
                  {entry.entity} {entry.entityId ? `· ${entry.entityId}` : ""} ·{" "}
                  {entry.userId ? `por ${entry.userId}` : "sin usuario"} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("es-MX")}
                </p>
                {entry.payload ? (
                  <pre className="mt-2 overflow-x-auto text-xs whitespace-pre-wrap text-ash-2">
                    {entry.payload}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
