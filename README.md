# Kort

Sistema de gestion integral para barberias. Monorepo con `backend` (Node.js + TypeScript +
Express + Prisma) y `frontend` (React + TypeScript + Vite), usando npm workspaces.

Este setup inicial trae el esqueleto corriendo con autenticacion JWT y roles (Dev / Encargado /
Barbero) funcionando de punta a punta sobre un modulo de ejemplo: **Clientes**. El resto de los
modulos (turnos, cortes, stock, ventas, tesoreria, jornadas, estadisticas, parametrizados, merch)
se agregan sobre esta misma base, modulo por modulo.

## Requisitos

- Node.js 20+
- Docker (para levantar Postgres local) o una instancia de PostgreSQL propia

## Arranque local

1. Instalar dependencias (en la raiz, con workspaces):

   ```bash
   npm install
   ```

2. Levantar Postgres local:

   ```bash
   docker compose up -d
   ```

3. Configurar variables de entorno:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

4. Migrar la base de datos y generar el cliente de Prisma:

   ```bash
   npm run prisma:migrate -w backend -- --name init
   npm run prisma:generate
   ```

5. Crear el usuario Dev inicial (seed):

   ```bash
   npm run prisma:seed
   ```

   Credenciales por defecto (configurables en `backend/.env`):
   `dev@kort.local` / `Password123!`

6. Levantar backend y frontend juntos:

   ```bash
   npm run dev
   ```

   - Backend: http://localhost:4000
   - Frontend: http://localhost:5173

## Estructura

```
backend/
  prisma/            # schema.prisma, migrations, seed
  src/
    config/          # variables de entorno
    lib/             # cliente de Prisma
    middleware/      # verifyToken, authorize (por rol), errorHandler
    modules/
      auth/          # login (JWT)
      clients/       # CRUD completo (plantilla de referencia)
      ...            # proximos modulos se agregan aca

frontend/
  src/
    theme/           # ThemeProvider (modo claro/oscuro)
    layouts/         # AdminLayout (sidebar + header segun rol)
    components/      # ProtectedRoute, ThemeToggle
    modules/
      auth/          # LoginPage, AuthContext
      dashboard/     # stub
      clients/       # CRUD conectado a la API (plantilla de referencia)
      ...            # proximos modulos se agregan aca
```

## Scripts de raiz

- `npm run dev` — levanta backend y frontend en paralelo.
- `npm run build` — build de produccion de ambos.
- `npm run lint` — ESLint sobre todo el repo.
- `npm run format` — Prettier sobre todo el repo.
- `npm run prisma:generate` / `prisma:migrate` / `prisma:seed` — atajos hacia el workspace backend.

## Deploy

- Backend: Render (`render.yaml`), plan `free`. Postgres e imagenes: Supabase (Postgres +
  Storage, ver `backend/.env.production.example`).
- Frontend: Vercel.

### Cold start del backend (Render free)

El plan `free` de Render duerme el servicio despues de ~15 minutos sin trafico y tarda 30-50s en
responder el primer request mientras arranca de nuevo. Esto es una limitacion de la infraestructura,
no se puede evitar desde adentro de la app mientras esta dormida. Mitigacion implementada:

1. **Ping externo** (`.github/workflows/keep-alive.yml`): un workflow de GitHub Actions pega a
   `GET /api/health` cada 10 minutos (menos que el timeout de 15 min de Render), asi el servicio
   nunca llega a dormirse. Si cambia la URL del backend, no hace falta editar el workflow: crear/
   actualizar la variable de repo **Settings > Secrets and variables > Actions > Variables >
   `RENDER_HEALTH_URL`** con la URL completa del health check (ej.
   `https://kort-backend.onrender.com/api/health`). Sin esa variable, usa esa misma URL por
   default.
2. **Frontend mas tolerante**: `frontend/src/lib/apiClient.ts` usa un timeout de 60s (en vez de
   quedarse esperando indefinidamente o fallar antes de que el backend termine de arrancar) y
   distingue ese caso (`isColdStartError`) de un error de credenciales/validacion. El login
   (`LoginPage.tsx`) reintenta automaticamente un par de veces mostrando "El sistema esta
   iniciando..." en vez de tirar directo un error de red generico.

Si el negocio crece y el ping externo deja de ser suficiente (o sus 10-14 min de latencia dejan de
ser aceptables), la solucion definitiva es pasar el backend a un plan pago de Render (`Starter` en
adelante), que no duerme el servicio. No es necesario ahora, queda anotado para el futuro.

## Roles

| Rol | Alcance |
|---|---|
| Dev | Acceso total. Unico rol que puede designar otros "Dev". |
| Encargado | Todo el sistema salvo designar "Dev". Unico con acceso a Jornadas y Estadisticas. |
| Barbero | Clientes, Turnos y horarios, Registro de cortes. |

La autorizacion por rol se aplica en el backend via el middleware `authorize(...roles)`
(`backend/src/middleware/authorize.ts`) y en el frontend ocultando secciones del sidebar y
protegiendo rutas con `ProtectedRoute` (`frontend/src/components/ProtectedRoute.tsx`).
