# Despliegue en Cloudflare

## Camino

`pnpm cf:build` (OpenNext) → `pnpm cf:deploy` (`wrangler deploy`). `pnpm cf:preview`
levanta workerd en local. Hay `cf:deploy:directo`, que salta OpenNext y despliega
`.open-next/` tal cual — útil para aislar si un fallo viene de OpenNext o del Worker.

## Bindings (`wrangler.jsonc`)

| Binding                    | Tipo    | Para qué                                      |
| -------------------------- | ------- | --------------------------------------------- |
| `tienda_ac`                | D1      | catálogo, pedidos, autenticación              |
| `NEXT_TAG_CACHE_D1`        | D1      | caché de tags de ISR, base aparte a propósito |
| `NEXT_INC_CACHE_R2_BUCKET` | R2      | páginas renderizadas por ISR                  |
| `ASSETS`                   | Assets  | estáticos                                     |
| `WORKER_SELF_REFERENCE`    | Service | revalidación en segundo plano                 |

La caché de tags va en su propia base porque son tablas internas de Next.js;
mezclarlas con el catálogo haría imposible razonar sobre los límites.

## Migraciones

Se aplican con `wrangler d1 migrations apply` usando la sesión OAuth del
desarrollador, no con drizzle-kit. Por eso `drizzle.config.ts` declara
`driver: "d1-http"`: ese config sirve para `db:generate` y para un futuro CI, pero
el camino de siempre es `db:migrate:*`.

Si cambias `src/lib/db/schema.ts`: `pnpm db:generate` y commitear el `.sql`. En
producción, `db:migrate:remote` antes de desplegar.

## Entorno

Solo hace falta `NEXT_PUBLIC_SITE_URL` para desarrollo. En producción la fija
`.env.production`, que **está versionado** y contiene únicamente la URL pública
(`https://tienda-ac.ac-mx.workers.dev`). Sin ella, `site.url` cae a
`http://localhost:3000` y se publicarían canónicas y Open Graph apuntando a localhost.

R2 para imágenes y MercadoPago aparecen comentados en `.env.example` porque
pertenecen a partes que todavía no existen.

## Estado del repo

- `.env.production` versionado a propósito (solo URL pública, no es secreto).
- `opencode.json` versionado.
- `main` **sin upstream**: nada pusheado todavía.
- El número de WhatsApp real está en `src/config/brand.ts` commiteado. No es un
  secreto —se muestra en `wa.me` a cualquier visitante— pero es dato de negocio que
  entró al historial de git de forma irreversible.
