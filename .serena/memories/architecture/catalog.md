# Catálogo: D1 + ISR

## De dónde sale

`lib/data/catalog-repository.ts` lee de D1 y devuelve tipos de dominio. Antes leía
de un archivo; la migración a D1 no tocó ni un componente, porque los componentes
nunca spoke con la fuente de datos directamente (ver `mem:core`).

`lib/data/seed-products.ts` es la fuente de verdad del contenido de arranque.
`pnpm db:seed` lo deriva a `scripts/seed.sql` y lo aplica.

## ISR: el punto que hay que respetar

`/`, `/tienda` y `/producto/[slug]` se revalidan a los 300s. Consecuencia práctica:
**el stock que ve una ficha puede tener hasta 5 minutos de retraso**, y por eso el
stock se comprueba de nuevo en la base al pedir (ver `mem:architecture/trust_boundary`).

`generateStaticParams` solo devuelve los productos `published`. El seed tiene 3, de
los cuales 2 son `published`: un build con la base sembrada debe listar exactamente
2 rutas `/producto/...`. Si salen 0, la base no está sembrada en ese entorno.

## `revalidatePath` después de un pedido

`src/app/checkout/actions.ts` invalida, tras escribir un pedido:

- `/` y `/tienda` — muestran stock en la rejilla
- `/producto/<slug>` de **los productos de ese pedido**, no todas

Se revalidan solo las fichas afectadas porque la ficha muestra "quedan N piezas" en
el selector de talla: sin eso se puede volver a intentar comprar lo que ya se
agotó, durante la ventana de ISR. Y solo esas, porque invalidar todas las fichas en
cada venta tira abajo el HTML de páginas que no cambiaron.

Los slugs los devuelve `createOrder` en `result.productSlugs` (deduplicados: un
pedido puede traer dos tallas del mismo producto, que es una sola ficha). No se
consulta la base otra vez en la acción — el repositorio ya los tenía.

`createOrder` es el **único** escritor de stock en todo `src/`. Si aparece otro,
hay que revalidar ahí también.

## Sin indexar

`site.noIndexPaths` se borró a propósito. Cada página declara su propio
`metadata.robots`, que es la vía que Next entiende de forma nativa; una lista
central sería una segunda fuente de verdad que nadie consulta y que se queda atrás.
`/carrito` y `/checkout` ya lo hacen. Cuando exista `/admin`, repetir el patrón ahí.
