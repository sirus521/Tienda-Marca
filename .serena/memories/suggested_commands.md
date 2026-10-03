# Comandos

## Everyday

```bash
pnpm dev            # next dev (Wrangler simula los bindings: D1 funciona en local)
pnpm typecheck      # tsc --noEmit
pnpm lint           # eslint (flat config, sin argumentos)
pnpm format         # prettier --write  "**/*.{ts,tsx,css,md,json}"
pnpm format:check   # la puerta que hay que cumplir antes de commitear
```

## Base de datos

```bash
pnpm db:generate                    # drizzle-kit generate → nuevo .sql en drizzle/
pnpm db:migrate:local               # wrangler d1 migrations apply --local
pnpm db:migrate:remote              # requiere sesión de Cloudflare
pnpm db:seed:local / :remote        # deriva scripts/seed.sql desde seed-products.ts y lo aplica
```

`scripts/seed.sql` se regenera en cada `db:seed` y está gitignorado. Todas las
sentencias del seed son `INSERT OR REPLACE`: reejecutar no duplica nada.

## Cloudflare

```bash
pnpm cf:build      # opennextjs-cloudflare build
pnpm cf:preview    # build + servidor local de workerd
pnpm cf:deploy     # build + wrangler deploy
pnpm cf:deploy:directo   # salta OpenNext y despliega .open-next/ tal cual
```

Dos avisos del build que son **normales y no bloquean**: el de
`workerd compatibility_date` antiguo, y `ExperimentalWarning: localStorage is not
available because --localstorage-file was not provided` (solo afecta a
`cf:preview`).

## Notas de Linux

- El proyecto es un repo git en `main` **sin upstream configurado** y nada pusheado
  todavía. `git log origin/main..HEAD` falla; no asumas que existe `origin/main`.
- `git status` sale limpio aunque `.serena/` tenga cambios: `.serena/.gitignore`
  ignora `/cache` y `/project.local.yml`, pero `project.yml` sí está versionado a
  propósito (comparte la config de LSP del proyecto).
- Los avisos de `compatibility_date` y `deprecated subdependencies` de pnpm se
  pueden ignorar; no son errores.
