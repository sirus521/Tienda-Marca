# AC — tienda de playeras oversize

Tienda en línea de playeras oversize de algodón pesado. Next.js 16 sobre
Cloudflare Workers, con el catálogo y los pedidos en D1.

- **Catálogo** — React Server Components con ISR. Se revalida cada 5 minutos.
- **Bolsa** — estado en el cliente (Zustand) persistido en `localStorage`.
- **Checkout** — registra el pedido en D1 y entrega el enlace de WhatsApp con el
  detalle escrito. No se cobra nada en la web.

---

## Requisitos

- Node.js >= 20.9
- pnpm 11
- Una cuenta de Cloudflare (solo para desplegar)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # opcional: solo hace falta la URL del sitio
pnpm dev
```

`next dev` levanta un proxy de plataforma con Wrangler que simula los bindings
de Cloudflare, así que D1 funciona en local sin desplegar nada.

### Base de datos

Las migraciones las aplica Wrangler con tu sesión de OAuth (`wrangler login`),
no drizzle-kit. Esa es la razón de que `drizzle.config.ts` declare
`driver: "d1-http"`: queda ahí para `db:generate` y para futuras migraciones
desde CI, pero el camino de siempre es `db:migrate:*`.

```bash
pnpm db:migrate:local     # aplica a .wrangler/state
pnpm db:migrate:remote    # aplica a la base real
```

Para llenar el catálogo:

```bash
pnpm db:seed:local        # genera scripts/seed.sql y lo aplica en local
pnpm db:seed:remote       # ídem contra la base real
```

El seed viene de `src/lib/data/seed-products.ts` y todas sus sentencias son
`INSERT OR REPLACE`: se puede volver a ejecutar sin duplicar nada.

## Despliegue

```bash
pnpm cf:deploy            # build con OpenNext + wrangler deploy
pnpm cf:preview           # build + servidor local de workerd
```

Los recursos de Cloudflare que usa el proyecto:

| Binding                    | Tipo    | Para qué                             |
| -------------------------- | ------- | ------------------------------------ |
| `tienda_ac`                | D1      | catálogo, pedidos, autenticación     |
| `NEXT_TAG_CACHE_D1`        | D1      | caché de tags de ISR, en base aparte |
| `NEXT_INC_CACHE_R2_BUCKET` | R2      | páginas renderizadas por ISR         |
| `ASSETS`                   | Assets  | estáticos                            |
| `WORKER_SELF_REFERENCE`    | Service | revalidación en segundo plano        |

La caché de tags va en su propia base a propósito: son tablas internas de
Next.js y mezclarlas con el catálogo haría imposible razonar sobre los límites.
El detalle está en `wrangler.jsonc`.

## Variables de entorno

Solo hace falta una para desarrollo:

| Variable               | Para qué                                             |
| ---------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | URL canónica: Open Graph, sitemap, enlaces absolutos |

En producción la fija `.env.production`, que está versionado y solo contiene esa
URL. Sin ella `site.url` cae a `http://localhost:3000` y se publicarían
canónicas y Open Graph apuntando a localhost.

Las demás están comentadas en `.env.example` porque pertenecen a partes que
todavía no existen: R2 para imágenes de producto, y MercadoPago si algún día
`brand.commerce.checkoutMode` deja de ser `"whatsapp"`.

## Scripts

| Comando                                      | Qué hace                                      |
| -------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                   | servidor de desarrollo con bindings simulados |
| `pnpm build` / `pnpm start`                  | build y arranque en Node (no en Workers)      |
| `pnpm typecheck`                             | `tsc --noEmit`                                |
| `pnpm lint`                                  | ESLint                                        |
| `pnpm format`                                | Prettier                                      |
| `pnpm db:generate`                           | genera un `.sql` nuevo desde el esquema       |
| `pnpm db:migrate:local` / `:remote`          | aplica migraciones                            |
| `pnpm db:seed:local` / `:remote`             | siembra el catálogo                           |
| `pnpm cf:build` / `cf:preview` / `cf:deploy` | ciclo de Cloudflare                           |

## Estructura

```
src/
  app/            rutas (App Router)
  components/     brand · cart · checkout · layout · motion · product · sections · ui
  config/         brand.ts (identidad) · nav.ts · site.ts (técnico)
  lib/
    db/           schema.ts (18 tablas) y client.ts (única puerta a D1)
    domain/       lógica pura: catálogo, carrito, dinero, pedidos
    data/         repositorios: la única frontera con la base
    stores/       estado de cliente
```

**La regla que sostiene el proyecto:** los componentes nunca hablan con la
base. Todo pasa por `lib/data/*-repository.ts`, que traduce filas al tipo de
dominio de `lib/domain/types.ts`. Por eso el catálogo pudo pasar de un archivo
a D1 sin tocar un solo componente.

Lo que viene del navegador nunca se toma como cierto. El carrito vive en
`localStorage`, así que el servidor vuelve a leer precios y stock de la base y
calcula los totales con esos valores. Ver `src/lib/data/order-repository.ts`.
