# Convenciones

## Idioma

**Todo en español**: comentarios, textos de UI, mensajes de error orientados a
quien compra, y mensajes de commit. Salvo nombres de símbolos públicos estándar y
palabras claves del lenguaje.

## Comentarios

El estilo del proyecto es comentario-explicación: **dice por qué, no qué**. Los
archivos de `lib/` abren con un bloque `/* === */` que expone la decisión dominante
del archivo y su alternativa descartada. Escribir un `// incrementa el contador`
no aporta; escribir _por qué_ D1 no admite transacciones y qué se usa en su lugar,
sí.

Cuando una regla se cumple "porque sí" en dos sitios, el segundo sitio se quita o
se delega al primero. La duplicación de una regla de negocio se considera deuda.

## Nombres

- Archivos y directorios en `kebab-case.ts(x)`.
- Componentes, funciones y tipos en `PascalCase` / `camelCase`.
- Constantes en `SCREAMING_SNAKE_CASE` cuando son literales de módulo
  (`FOLIO_ALPHABET`, `STOCK_CHECK_NAME`).
- Tipos del dominio en `lib/domain/types.ts` y tipos narrowed junto a su función
  (`PricedLine` vive en `order.ts`, no en `types.ts`, porque solo la usa ahí).

## Código

- **Tipos explícitos en fronteras**: entradas de repositorio, salidas de `getDb()`.
- **Schemas de zod junto a su dominio**, no centralizados: `cartLineSchema` en
  `cart.ts`, `checkoutSchema`/`customerSchema` en `order.ts`.
- Early returns con guarda; evita anidar.
- `export function`, sin `export default` salvo en `next.config.ts`.
- Un tipo por archivo no: agrupar por dominio.
- Importes de `lib/domain` nunca importan de `lib/data` ni de `lib/db`. La
  dirección es de una sola sentido; `domain` no sabe que existe D1.

## Dinero

Enteros en centavos, siempre. `Math.round` antes de guardar. Cero explícito en
lugar de `undefined` cuando el valor depende de una regla que aún no existe
(el envío hoy es 0 porque se acuerda por WhatsApp).
