### 🚀 Despliegue en Render

1. Ve a [dashboard.render.com](https://dashboard.render.com) e inicia sesión
2. Click **New +** → **Blueprint**
3. Conecta el repo `sirus521/Tienda-Marca`
4. Render detectará automáticamente el `render.yaml` y creará:
   - Web Service: `tienda-ac` (Node.js)
   - Database: `tienda-ac-db` (Postgres) — opcional, si usas DB

### Variables de entorno requeridas

En el Web Service, añade en **Environment**:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | (opcional, si no usas DB) |
| `NEXTAUTH_SECRET` | Genera con: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://tu-app.onrender.com` |

### Comandos de build

- **Build Command:** `npm run build`
- **Start Command:** `npm run start`

### Notas

- La app usa Next.js 15 con App Router
- El `render.yaml` configura el despliegue auto desde `main`
- Si solo necesitas frontend estático sin DB, elimina la sección `database` del `render.yaml`
