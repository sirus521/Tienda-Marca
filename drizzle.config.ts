import { defineConfig } from "drizzle-kit";

/**
 * Configuración de drizzle-kit para Cloudflare D1.
 *
 * `driver: "d1-http"` hace que las migraciones se apliquen contra la API de
 * Cloudflare con las credenciales de abajo, no contra un archivo local. Es la
 * diferencia entre `d1 execute --local` y una base de producción: la primera
 * escribe en `.wrangler/state` y la segunda en la base real.
 *
 * Las tres credenciales van en variables de entorno a propósito. Este archivo
 * se versiona; un token de API de Cloudflare no.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
  /* Drizzle genera los `.sql` a partir del esquema. Con `strict` activado
     falla si encuentra un archivo generado que no corresponde a nada, que es
     la forma de detectar una migración editada a mano. */
  strict: true,
  verbose: true,
});
