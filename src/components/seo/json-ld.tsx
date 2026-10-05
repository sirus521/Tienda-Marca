import type { ReactElement } from "react";

/**
 * JSON-LD
 * ============================================================================
 * Inyecta datos estructurados para Google. `data` debe ser un objeto ya
 * serializable; se escapa solo el `>` para no romper el HTML (`</script>`).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): ReactElement {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // Datos controlados por el servidor (catálogo), no baja de fuentes externas.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
