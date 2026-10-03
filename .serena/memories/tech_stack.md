# Stack

- Node >= 20.9, pnpm 11.3.0 (`packageManager`). No npm/yarn.
- Next.js 16.3 App Router, React 19.3, TypeScript 5.9 `strict: true`.
- `tsconfig`: `target ES2022`, `moduleResolution bundler`, alias `@/*` → `./src/*`.
  Usar siempre `@/` en imports, nunca rutas relativas.
- Cloudflare Workers vía `@opennextjs/cloudflare` 1.20. `wrangler` 4.135.
- D1 vía `drizzle-orm` 0.45. R2 para imágenes (aún sin usar).
- `zod` 4 para validación; `zustand` 5 para el carrito; `motion` 13 y `lenis` 1.3 para animación.
- Tailwind 4 vía `@tailwindcss/postcss`, sin `tailwind.config` — el tema está en
  `src/app/globals.css` con `@theme`.

## Importante

- **No hay runner de tests.** Ni vitest, ni jest, ni playwright. La verificación es
  exclusivamente typecheck + lint + format:check + build. No busques tests que correr.
- `prettier` con `prettier-plugin-tailwindcss` lee el tema de `src/app/globals.css`
  para ordenar clases. Ordena las clases en el `className`; no rompe nada, pero
  ensucia el diff si editas un `className` a mano.
- `drizzle.config.ts` declara `driver: "d1-http"` a propósito. Las migraciones se
  aplican con `wrangler d1 migrations apply` (sesión OAuth), NO con drizzle-kit.
  Ver `mem:architecture/deploy`.
- Las tablas de autenticación (`admin_users`, `admin_accounts`, `session_tokens`,
  `auth_verifications`) existen en el esquema pero **no hay librería de
  autenticación instalada ni panel admin**. No des por hecho que haya login.
