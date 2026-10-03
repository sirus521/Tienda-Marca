import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Configuración de OpenNext para Cloudflare Workers.
 *
 * DECISIÓN: R2 para la caché incremental
 * El catálogo usa ISR con revalidación cada 5 minutos, así que cada página
 * renderizada tiene que sobrevivir entre peticiones. En Workers no hay disco,
 * y el valor por defecto (solo memoria del isolate) se pierde en cada
 * invocación. R2 es la opción que corresponde: 10 GB incluidos y el tráfico
 * de salida es gratis, cosa que en imágenes es exactamente lo que se quiere.
 *
 * La caché de tags (para `revalidatePath`) no se declara aquí: usa el binding
 * `NEXT_TAG_CACHE_D1` de `wrangler.jsonc`, que es la vía recomendada cuando ya
 * hay una base de datos en el proyecto.
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
