import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

/**
 * Tipos de los bindings de Cloudflare.
 *
 * OpenNext declara `CloudflareEnv` como interfaz global vacía y espera que cada
 * proyecto la extienda con sus propios bindings. Sin esta declaración,
 * `env.tienda_ac` sería un error de TypeScript aunque el binding exista en
 * `wrangler.jsonc`: el archivo JSON no se lee en tiempo de compilación.
 */
declare global {
  interface CloudflareEnv {
    /** Base de datos D1 de la tienda. */
    tienda_ac: D1Database;
    /** Bucket de la caché incremental de ISR. Lo usa OpenNext internamente. */
    NEXT_INC_CACHE_R2_BUCKET?: R2Bucket;
  }
}

export {};
