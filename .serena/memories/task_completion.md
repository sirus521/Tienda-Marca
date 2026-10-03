# Antes de dar algo por terminado

No hay tests (ver `mem:tech_stack`). La puerta es:

```bash
pnpm typecheck && pnpm lint && pnpm format:check
```

Los tres deben salir limpios. `format:check` importa tanto como los otros dos: lleva
mucho tiempo en la puerta precisamente porque se ignoraba.

## Cuándo añadir `pnpm cf:build`

Obligatorio si el cambio toca:

- `wrangler.jsonc`, bindings, `next.config.ts`, `open-next.config.ts`
- cualquier cosa que se ejecute en el Worker: `app/**` con Server Actions,
  acceso a D1, `crypto.randomUUID`
- `package.json` (dependencias) o el lockfile

No hace falta para: componentes puramente presentacionales, `lib/domain/`,
`config/`, CSS.

## Antes de commitear

- `git status` limpio y solo con lo intencionado. Ojo con `git add -A`: `.serena/`
  está versionado a propósito, así que entra si hay cambios.
- Si tocaste `schema.ts`, hace falta `pnpm db:generate` y commitear el `.sql` de
  `drizzle/`.
- Si tocaste `seed-products.ts`, no hay que regenerar nada: `scripts/seed.sql` se
  deriva en cada `db:seed` y está gitignorado.

## Al terminar

Informar de los comandos ejecutados y su resultado real. Si algo quedó sin
verificar, decirlo; no dar por bueno un build que no se ejecutó.
