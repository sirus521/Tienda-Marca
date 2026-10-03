# Frontera de confianza: el carrito es entrada hostil

## El problema

El carrito vive en `localStorage` (`src/lib/stores/cart-store.ts`). Quien abra las
herramientas de desarrollo puede cambiar el precio a $1, la cantidad a 500 o el id
de variante al que quiera. Cualquier cosa que se lea del cliente y afecte al dinero
o al inventario es un dato sin verificar.

## Lo que sí se confía, y por qué

Nombre, teléfono e instrucciones del cliente. No tienen forma de untrueverse: son
datos que solo esa persona tiene.

## Lo que no se confía, y cómo se compensa

`createOrder` en `src/lib/data/order-repository.ts` es el archivo donde esto se
resuelve, y sigue este orden a propósito porque cada paso acota al siguiente:

1. **Resolver** cada línea contra el catálogo. Una variante inexistente o con
   producto despublicado se descarta.
2. **Comprobar stock** contra la base. Si algo se agotó entre agregar y pagar, se
   dice qué producto y cuántos quedan, en vez de crear un pedido imposible.
3. **Calcular totales** con los precios de la base, nunca los del carrito.
   `computeTotals` (ver `mem:core`).
4. **Escribir** cabecera, líneas, historial y descuento de stock en un solo
   `batch()`.

## Por qué la garantía la pone D1, no el código

D1 no admite transacciones interactivas: no se abre BEGIN, lee, escribe y cierra.
Sí ofrece `batch()`, que corre el grupo dentro de una transacción implícita.

Eso obliga a que el stock no pueda quedar negativo ni aunque dos personas compren la
última unidad a la vez: `product_variants` tiene `CHECK (stock >= 0)`. El segundo
`UPDATE` intentaría dejar -1, el CHECK lo rechaza, y `batch()` revierte el pedido
entero. Un `if (stock > 0)` en JavaScript dejaría una ventana entre la lectura y la
escritura.

Identificar ese CHECK en el mensaje de error de D1 es el trabajo de
`isStockCheckViolation` / la traducción de errores al final de ese archivo.

## Trampa conocida

La línea recibe `imageUrl` del cliente y se guarda tal cual. No está validada contra
el catálogo. Hoy no es explotable (la imagen solo se usa en el mensaje de WhatsApp y
es un dato público del producto), pero si algún día se renderiza en el admin, hay
que resolverla desde la base.
