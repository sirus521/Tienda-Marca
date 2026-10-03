import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "@/lib/db/schema";

/**
 * Cliente de D1.
 * ============================================================================
 * Única puerta de entrada a la base de datos. Si otro archivo importa
 * `drizzle-orm/d1` directamente, dos cosas se rompen sin que se note: la
 * obtención del contexto y el tipado del binding.
 *
 * POR QUÉ ES ASÍNCRONO
 * `getCloudflareContext()` tiene dos modos y no son intercambiables:
 *
 *   · Síncrono   → render en servidor, rutas, server actions. El contexto
 *                  ya existe porque hay una petición en curso.
 *   · Asíncrono  → generación estática y `generateStaticParams`. En el build
 *                  todavía no hay petición, así que hay que esperar a que
 *                  Workers publique el contexto.
 *
 * Mezclarlos produce un error que aparece solo en el build de producción, que
 * es el peor sitio para descubrirlo. Por eso el repositorio recibe siempre un
 * cliente ya construido y quien lo pide elige el modo según el contexto.
 */
export type D1Client = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Cliente de D1.
 *
 * Se usa el modo ASÍNCRONO siempre, incluso en render y en server actions. El
 * modo síncrono existe (`getCloudflareContext()` a secas) y es más rápido, pero
 * solo funciona cuando ya hay una petición en curso. Como las mismas funciones
 * del repositorio se ejecutan tanto en el build (`generateStaticParams`) como
 * en una petición, el modo asíncrono es el único que sirve en los dos casos.
 *
 * El coste es un `await` por llamada. Pagarlo una vez aquí evita el error
 * clásico de este patrón, que solo aparece en producción: una página que sí se
 * generó bien en local y revienta en el `next build` porque el contexto no
 * estaba resuelto.
 */
export async function getDb(): Promise<D1Client> {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.tienda_ac, { schema });
}
