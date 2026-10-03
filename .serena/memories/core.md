# Tienda-AC-labs — mapa del proyecto

Tienda de playeras oversize. Next.js 16 App Router sobre Cloudflare Workers.
Un solo proyecto, no monorepo. Español en comentarios, UI y commits.

## Capas y dirección de las dependencias

```
app/ + components/   →   lib/data/*-repository.ts   →   lib/db/client.ts → D1
                                    ↓
                            lib/domain/*  (lógica pura, sin I/O)
```

- **Los componentes NUNCA hablan con la base.** Todo pasa por `lib/data/*-repository.ts`,
  que traduce filas de D1 al tipo de dominio de `lib/domain/types.ts`. Añadir un
  `getDb()` en un componente rompe el diseño, no una convención.
- `lib/domain/` es lógica pura: `money.ts`, `cart.ts`, `catalog.ts`, `order.ts`.
  Sin I/O, sin React. Por eso el catálogo pudo migrar de un archivo a D1 sin tocar
  un componente.
- `src/lib/db/client.ts` es la única puerta a D1.

## Invariantes que no deben romperse

- **El carrito vive en `localStorage`, así que el navegador es hostil.** Nada de lo
  que llega de él se toma como cierto: precio, stock y existencia de la variante se
  vuelven a leer de la base, y los totales se calculan con esos valores.
  Ver `mem:architecture/trust_boundary`.
- **El dinero son enteros en centavos.** Nunca float. `formatMoney` /
  `sumCents` en `lib/domain/money.ts`. Moneda MXN.
- **El stock nunca baja de 0** y lo garantiza la base, no el código:
  `CHECK (stock >= 0)` en `product_variants`, aplicado dentro de `batch()` de D1
  (no hay transacciones interactivas). Ver `mem:architecture/trust_boundary`.
- **Los totales se calculan en un solo sitio:** `computeTotals` en
  `lib/domain/order.ts`. Si aparece una segunda cuenta de totales, es un bug.

## Rutas

- `/`, `/tienda`, `/producto/[slug]` — ISR, revalidate = 300s. Ver `mem:architecture/catalog`.
- `/carrito`, `/checkout` — estáticas, `metadata.robots` noindex declarado en cada página.
- Checkout en `src/app/checkout/actions.ts` (Server Action, `"use server"`).

## Memorias

- `mem:tech_stack` — versiones y herramientas que importan al editar.
- `mem:conventions` — idioma, estilo, naming, schemas.
- `mem:suggested_commands` — comandos del proyecto y su forma en Linux.
- `mem:task_completion` — qué tiene que pasar antes de dar algo por terminado.
- `mem:architecture/trust_boundary` — por qué el carrito no es confiable y cómo lo compensa D1.
- `mem:architecture/catalog` — D1 + ISR + `revalidatePath` tras un pedido.
- `mem:architecture/deploy` — Workers, bindings de `wrangler.jsonc`, migraciones.
