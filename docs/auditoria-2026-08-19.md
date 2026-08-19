# Auditoría general de Kort ERP — Plan de mejora

**Fecha:** 2026-08-19
**Metodología:** lectura directa de código (`backend/src`, `frontend/src`, `backend/prisma/schema.prisma`, migraciones, middleware, CI, configuración de entorno), usando `skills.md` como fuente de verdad funcional. Todo hallazgo cita archivo:línea concreto salvo que se marque explícitamente como "no verificable desde el código".

---

## 1. Resumen ejecutivo

Kort ERP está en un estado sólido de implementación: la gran mayoría de los módulos de `skills.md` §5 (turnos, clientes, cortes, artículos/stock, ventas, tesorería, jornadas, estadísticas, catálogos parametrizados, merch) están **implementados y bien construidos**, con transacciones atómicas correctas en los flujos de dinero/stock, aislamiento de roles verificado en backend y frontend, y catálogos parametrizados reales (no hardcodeados). Hay además funcionalidad completa fuera del spec original (cupones/descuentos, reportes exportables, proveedores y órdenes de compra con gating por plan) que está bien construida pero no está documentada como alcance comercial aprobado.

El **riesgo principal** es que las notificaciones al cliente final — mail de confirmación de turno y recordatorio por WhatsApp 6hs antes, ambas explícitamente prometidas por la UI del wizard de turnos — **no están implementadas**: son un stub que solo hace `console.log`, sin proveedor conectado y sin ningún mecanismo de scheduling para el recordatorio. Esto es tanto un gap funcional crítico como un problema de confianza con el cliente final, que ve una promesa en pantalla que no se cumple.

El **segundo riesgo** es de escalabilidad y calidad silenciosa: no hay paginación en ningún listado operativo, el frontend entrega un único bundle de 442 KB sin code-splitting, no existe un solo test automatizado, y el único workflow de CI es el keep-alive del cold-start (sin lint/typecheck/build/test como gate de PR). Hoy funciona porque el volumen es bajo (una sola barbería), pero no hay red de seguridad para crecer ni para detectar regresiones en lógica que maneja dinero real (stock, ventas, tesorería, descuentos).

La **principal oportunidad** es que la base arquitectónica ya está bien resuelta — no hace falta un rediseño mayor. El trabajo pendiente es mayormente "conectar lo que falta" (notificaciones reales) y "blindar lo que ya funciona" (paginación, tests, CI, índices de base de datos).

---

## 2. Hallazgos por dimensión

### 2.1 Cobertura funcional vs. `skills.md` §5

| Módulo | Estado | Severidad del gap |
|---|---|---|
| Turnos y horarios de atención | Parcial | **Crítico** (notificaciones) |
| Clientes | Completo | — |
| Registro de cortes | Parcial | Medio (foto no visible al cliente final) |
| Artículos y stock | Completo | — |
| Ventas | Completo (gap en Tesorería, ver §2.2) | — |
| Tesorería (incl. punto de equilibrio) | Completo | — |
| Jornadas laborales | Completo | — |
| Centro de estadísticas | Completo | — |
| Panel de parametrizados | Completo | — |
| Tienda de merchandising | Completo | — |
| Usuarios y roles | Completo (con nota de cohesión, ver abajo) | Bajo |
| Dashboard | Completo | — |
| Notificaciones (mail + WhatsApp) | **No implementado** | **Crítico** |

Detalle relevante:

- **Turnos** (`backend/src/modules/appointments/appointments.service.ts`): flujo completo — datos del cliente, elección de barbero/horario según disponibilidad real (`:151-191`), tipo de corte parametrizado (`:288-291`), oferta de navegar la tienda antes de confirmar (`frontend/src/modules/public-turnos/TurnoWizardPage.tsx:582-587`), código de turno único alfanumérico de 6 caracteres sin ambigüedad visual (`appointments.service.ts:17-31,322-351`, no UUID, no correlativo, respaldado por constraint único en DB). **Falta:** el mail de confirmación (`appointments.service.ts:58-62`) y el recordatorio WhatsApp (`:63-67`) son funciones `NotificationService` que solo hacen `console.log` — no hay proveedor conectado (sin nodemailer/sendgrid/resend/twilio en `package.json`, sin variables en `.env.example`) y **no hay ningún scheduler/cron/cola en todo el backend** (grep de `node-cron|bullmq|agenda|setInterval` sin resultados) que pueda disparar el recordatorio "6hs antes" — falta tanto el proveedor como el mecanismo de disparo. La UI del wizard promete esto explícitamente al cliente (`TurnoWizardPage.tsx:277-279,401`).
- **Registro de cortes** (`backend/src/modules/cuts`): alimenta Tesorería y Estadísticas correctamente (ver §2.2), soporta `photoUrl` en el schema y en el formulario admin (`CorteForm.tsx:113-118`). **Falta:** no hay ruta pública para cortes (`cuts.routes.ts` solo bajo `/api/cuts` con `verifyToken`, a diferencia de appointments/articles/merch/discounts que sí tienen router público en `app.ts:64-83`) ni endpoint de upload de imagen (a diferencia de Artículos, que sí tiene `POST /:id/image` con `multer`). `photoUrl` es un string libre sin `.url()` en el schema Zod (`cuts.schema.ts:16`) — la foto se guarda pero nunca es "visible para el cliente final" como pide el spec.
- **Usuarios y roles**: el modelo `User` tiene DNI y domicilio (`schema.prisma:40-42`), pero "días de trabajo y horarios de atención" viven en un modelo separado (`WorkSchedule`) gestionado desde el módulo Turnos, no desde Usuarios — funcionalmente equivalente pero desalineado de dónde el spec lo ubica. Severidad baja, es una decisión de UX razonable.
- **Fuera de spec, implementado y bien construido:** Descuentos/cupones (`backend/src/modules/discounts`), Reportes exportables Excel/PDF (`backend/src/modules/reports`), Proveedores y Órdenes de compra gateados a Plan Integral (`backend/src/modules/suppliers`, `purchase-orders`). Ninguno está en `skills.md` — se recomienda que negocio confirme si están aprobados/cotizados o si es scope creep no facturado.

### 2.2 Cumplimiento de reglas de negocio transversales

| Regla | Estado |
|---|---|
| Nada hardcodeado (catálogos parametrizados) | ✅ Cumple |
| Cliente único por teléfono | ✅ Cumple |
| Stock consistente (venta/merch transaccional) | ✅ Cumple |
| Cortes alimentan Tesorería y Estadísticas | ⚠️ Parcial |
| Notificaciones (mail + WhatsApp 6hs) | ❌ No cumple |
| Imágenes en cortes y productos | ⚠️ Parcial (solo Artículos) |
| Una barbería por implementación (no multi-tenant) | ✅ Cumple, bien documentado |

- **Catálogos parametrizados** (`backend/prisma/schema.prisma:158-195`, modelo genérico `ParameterCategory`/`ParameterItem`): no hay enums Prisma de negocio (`CutType`, `ProductType`) ni arrays hardcodeados en frontend. Tesorería valida categorías dinámicamente contra Parametrizados (`treasury.service.ts:21-38`).
- **Cliente único por teléfono**: `Client.phone` con `@unique` (`schema.prisma:60`), centralizado en `findOrCreateClientByPhone` (`clients.service.ts:58-65`), reutilizado por turnos, cortes, ventas y merch.
- **Stock transaccional**: tanto POS (`sales.service.ts:79-109`) como checkout de merch (`merch.service.ts:44-68`) descuentan stock dentro del mismo `prisma.$transaction` que crea la venta.
- **Cortes → Tesorería/Estadísticas — severidad media, violación parcial**: la creación del `Cut` es transaccional, pero el registro en Tesorería se dispara **después** de hacer commit, como llamada separada con manejo de error *best-effort* (`cuts.service.ts:109`, `treasury.service.ts:189-229`, mismo patrón en `sales.service.ts:111` y `merch.service.ts:113`). Si falla (p. ej. falta la categoría "Cortes" en Parametrizados), el corte/venta queda guardado **sin** movimiento de tesorería asociado, sin job de reconciliación ni reintento — contradice literalmente la regla "no es un registro aislado". Las Estadísticas sí cumplen la regla por la vía alternativa de cálculo on-the-fly sobre las tablas transaccionales (`stats.service.ts`).
- **Notificaciones**: ver §2.1 — no cumple, es un stub sin proveedor ni scheduler.
- **Imágenes**: pipeline real de upload solo para Artículos y Business-settings (`multer` + `StorageService` con Supabase Storage/disco local, `articles.routes.ts:47`); Cortes no tiene el mismo pipeline.
- **Una barbería por implementación**: no hay `tenantId`/`businessId` en ningún lado; `OrganizationSettings`/`BusinessSettings`/`AppointmentSettings` son filas singleton (`id @default(1)`), y el propio schema lo documenta explícitamente (`schema.prisma:375-379`: "No hay multi-tenancy real de datos - cada barbería es un deploy propio"). Diseño correcto y sin sobre-construcción.

### 2.3 Modelo de datos (`backend/prisma/schema.prisma`)

- **Índices faltantes — severidad media**: ninguna FK "simple" tiene `@@index` explícito (Postgres no lo crea automático si no es parte de un unique). Sin índice: `Appointment.clientId/tipoCorteId/discountId`, `Cut.clientId/barberoId/tipoCorteId/discountId`, `Sale.clientId/sellerId/discountId`, `SaleItem.articleId`, `StockMovement.articleId`, `TreasuryEntry.categoryId`. Riesgo bajo hoy (volumen chico), real de cara a crecimiento — cualquier "historial de cliente/barbero" o filtro por vendedor hace table scan.
- **Soft-delete vs hard-delete inconsistente — severidad media**: `ParameterCategory/Item` y `Discount` usan `deletedAt`; `User/Article/Proveedor` usan `active` boolean; pero `WorkSchedule`, `Client`, **`Cut`**, `OrdenCompra`, `TreasuryEntry` (manual) se borran físicamente. Notable: `Discount` usa soft-delete explícitamente "para no perder trazabilidad en ventas históricas" (`schema.prisma:533-534`) pero `Cut` — que es historial de negocio equivalente — se hard-deletea.
- **Campos de auditoría incompletos — severidad baja-media**: `createdByUserId` (quién hizo el cambio) solo existe en `TreasuryEntry` (`schema.prisma:364`). `Sale` muta su `status` (`PENDING_PICKUP→DELIVERED/CANCELLED`) pero no tiene `updatedAt` para saber cuándo. Ningún otro modelo (`Client`, `Article`, `ParameterItem`, `Discount`, `Proveedor`, `OrdenCompra`) rastrea autor de creación/edición.
- **Normalización**: razonable — precios se copian como snapshot intencional (`Cut.price`, `SaleItem.unitPrice`) para no romper histórico ante cambios de catálogo, decisión correcta y documentada en comentarios.

### 2.4 Seguridad

- **Login sin rate limiting — severidad media-alta**: `POST /api/auth/login` (`auth.routes.ts:8`) no tiene ningún limiter, a diferencia de los 3 endpoints públicos que sí lo tienen (turnos, checkout merch, validación cupón, 20 req/15min). Permite fuerza bruta de contraseñas sin fricción de red (solo la fricción computacional de bcrypt costo 12).
- **JWT en `localStorage` — severidad media**: `frontend/src/lib/apiClient.ts:2,35-45` guarda el token en `localStorage` (clave `kort-token`), no en cookie `httpOnly` — expone el token a robo vía XSS. Expiración configurable, default 8h (`env.ts:17`), sin refresh token, complementado por el cierre de sesión por 2hs de inactividad para Barbero/Encargado (`middleware/auth.ts:45-52`, `workshifts.service.ts:80-96`) — **confirmado que bloquea el request, no es solo un cálculo de reporte**. Nota: el rol DEV queda fuera de este chequeo de inactividad (asimetría, severidad baja).
- **CORS mal documentado — severidad media**: el matching en código es de string exacto (`app.ts:39-50`), pero `.env.production.example:19` sugiere `CORS_ORIGIN="https://kort-erp-*.vercel.app"` con wildcard — el código nunca interpreta `*`, así que ese patrón documentado no funciona. No está abierto a `*` global (no hay sobre-exposición), pero el mecanismo no soporta lo que su propia documentación operativa asume, lo que puede bloquear previews de Vercel o hacer que alguien copie un patrón inútil a producción.
- **Autorización por rol — buen cumplimiento en general**: revisados los 18 módulos de rutas, patrón consistente `verifyToken + authorize(...)`. La asignación del rol DEV está blindada a nivel de **servicio**, no solo de ruta (`users.service.ts:31-37`, `assertCanAssignRole` impide que un Encargado promueva a alguien a DEV) — defensa en profundidad ejemplar. Jornadas y Estadísticas correctamente restringidas a DEV/ENCARGADO en backend, routing y sidebar.
- **`requirePlan` sin filtro de rol — severidad baja-media, a confirmar con negocio**: Proveedores, Órdenes de compra y Reportes solo verifican `requirePlan('INTEGRAL')`, sin restricción de rol — un Barbero con Plan Integral activo puede exportar reportes contables y gestionar compras, lo cual contradice el criterio usado en el resto del sistema (Tesorería/Ventas/Stock vedados a Barbero). Está documentado como decisión intencional en comentarios del propio código, pero vale la pena que negocio lo confirme explícitamente.
- **Validación de inputs**: Zod usado consistentemente (47 usos en 17/18 controllers); único gap puntual es `Cut.photoUrl` sin `.url()`.
- **Sin exposición de datos sensibles**: no se encontró `password`/`passwordHash` en ningún `select` de respuesta (`users.service.ts:8-18` define `LIST_SELECT` explícito sin password).
- **Sin secretos commiteados**: `backend/.env` no está trackeado en git, cubierto por `.gitignore`; `.env.example`/`.env.production.example` solo tienen placeholders. `JWT_SECRET` no tiene fallback débil (`env.ts:3-9,16` hace `throw` si falta).

### 2.5 Performance y escalabilidad

- **Sin paginación en listados operativos — severidad alta**: `clients`, `appointments`, `sales`, `cuts`, `articles` — ningún `findMany` usa `take`/`skip`/cursor. Es el hallazgo de performance con mayor riesgo de degradación progresiva a medida que crece el volumen de datos.
- **Frontend sin code-splitting — severidad alta**: bundle único de **442 KB** sin comprimir (`frontend/dist/assets`), router (`frontend/src/router.tsx`) importa las ~24 páginas de forma estática, sin `React.lazy`/`Suspense`. Esto agrava la percepción de lentitud justo quando además hay que esperar el cold-start del backend, en especial en el portal público de turnos en mobile/3G.
- **N+1 dentro de transacciones — severidad media**: `StockService.applyMovement` (`stock.service.ts:13-57`) se invoca en un `for...of` secuencial (no `Promise.all`) en ventas POS, checkout merch, cancelación y recepción de órdenes de compra — con carritos grandes multiplica round-trips dentro de una transacción abierta, aumentando riesgo de timeout/lock contention.
- **Sin caching — severidad media**: no hay react-query/SWR en frontend ni cache en backend; catálogos poco cambiantes (parametrizados, business-settings) se refetchean en cada navegación.
- **Cold-start de Render — bien mitigado, sin hallazgos**: ping externo cada 10 min (`.github/workflows/keep-alive.yml`), `apiClient.ts` con timeout de 60s e `isColdStartError`, y **todas** las llamadas de red del frontend pasan por este cliente central (confirmado por grep, no hay axios ni fetch sueltos).

### 2.6 UX/UI y accesibilidad

- **Paleta de theme no coincide con el spec — severidad media**: el spec pide modo claro "blanco/grises con detalles azul/rojo" y modo oscuro "negro con dorado/blanco" (`skills.md` §3); el código implementa **verde+dorado en ambos modos** (`frontend/src/theme/theme.css`), sin azul ni rojo. Es un desvío de diseño consistente y bien ejecutado técnicamente (sistema de variables CSS limpio, sin hex sueltos fuera del theme), pero contradice literalmente el spec — requiere confirmación de negocio sobre cuál de los dos documentos está desactualizado.
- **Loading/error states — buena cobertura, sin hallazgos**: componente compartido `AsyncState` (`Skeleton`/`ErrorState`/`EmptyState`) usado en 23 de ~23 módulos de páginas.
- **Responsividad — presente pero limitada**: sin Tailwind, CSS con media queries en un solo breakpoint mayor (900px panel admin, 800/640px portal público) — severidad baja, layouts intermedios (tablet) pueden ser subóptimos.
- **Accesibilidad básica — sin negligencia sistemática**: paridad exacta de `alt` en imágenes (10/10), labels en inputs (23/24, el caso restante usa `aria-label` válido).

### 2.7 Testing y calidad

- **Cero tests automatizados — severidad alta**: ningún `*.test.*`/`*.spec.*` en todo el repo, sin Jest/Vitest instalado, sin script `"test"` en ningún `package.json`. Riesgo real dado que el sistema maneja lógica de stock, ventas, descuentos y tesorería (dinero real).
- **CI solo cubre el keep-alive — severidad alta**: `.github/workflows/` no tiene ningún workflow de lint/typecheck/test/build sobre PRs — el único control de calidad hoy es humano.
- **Lint — configurado y prácticamente limpio, con un gap de config**: `npm run lint` reporta 110 problemas (98 errores + 12 warnings), pero los 98 errores son falsos positivos por un solo archivo fuera de alcance (`design_handoff_kort_ui/support.js`, que no tiene `globals.browser` asignado en `eslint.config.js`). El código de producción real tiene solo 12 warnings menores (imports sin usar, `react-refresh/only-export-components`).

### 2.8 Deuda técnica

- **TODOs/FIXMEs — prácticamente inexistentes**, señal positiva de que no hay deuda "marcada y olvidada".
- **Código muerto puntual — severidad baja**: 3 imports/variables sin usar (`IconMore` en `AdminLayout.tsx:27`, `ANY_BARBERO` en `TurnoWizardPage.tsx:22`, `nivelStock` en `DashboardPage.tsx:8`), ya detectados por el propio lint.
- **Dependencias 1-2 majors atrasadas — severidad media**: Prisma 5→7 (dos majors), React 18→19, Express 4→5, Vite 5→8, TypeScript 5→7. Nada urgente ni con vulnerabilidad evidente, pero conviene planificar la migración de Prisma antes de que se acabe el soporte de la v5.
- **`.env.example` vs `.env.production.example` — sin drift real**: las diferencias entre ambos archivos son intencionales y están documentadas en sus propios comentarios (PORT inyectado por Render, Supabase Storage obligatorio en prod vs. opcional en dev).

### 2.9 Integraciones pendientes (`skills.md` §8)

| Integración | Estado real |
|---|---|
| Almacenamiento de imágenes | ✅ Resuelto — Supabase Storage en prod, disco local en dev (`storageService.ts`) |
| Código de turno único | ✅ Resuelto — alfanumérico de 6 caracteres, no correlativo, no UUID |
| Estructura de permisos por ruta | ✅ Resuelto — middleware `authorize()` + Zod |
| Modelo de datos de "parametrizados" | ✅ Resuelto — tabla genérica `ParameterCategory`/`ParameterItem` |
| Proveedor de correo transaccional | ❌ Pendiente — sin ninguna dependencia ni configuración, solo stub |
| Proveedor de WhatsApp Business API | ❌ Pendiente — sin ninguna dependencia ni configuración, solo stub, y sin mecanismo de scheduling |

`skills.md` §8 debería actualizarse: 4 de las 6 decisiones pendientes ya están resueltas en el código; solo faltan los dos proveedores de notificación (que además de "decidir el proveedor" requieren construir el mecanismo de scheduling, hoy inexistente).

---

## 3. Plan de mejora priorizado

### Quick wins (< 1 semana)

| # | Ítem | Por qué importa | Esfuerzo | Impacto | Tipo |
|---|---|---|---|---|---|
| 1 | Ajustar el copy del wizard de turnos para no prometer mail/WhatsApp mientras no funcionen (o marcarlos "próximamente") | Evita generar una expectativa falsa al cliente final ahora mismo, sin esperar a la integración completa | S | Alto | Mejora |
| 2 | Rate limiting en `POST /api/auth/login` | Cierra la única vía de fuerza bruta sin fricción de red detectada | S | Alto | Mejora |
| 3 | Arreglar `eslint.config.js` para excluir/configurar `design_handoff_kort_ui/support.js` | Hoy `npm run lint` reporta 98 errores falsos que ocultan el ruido real (12 warnings) | S | Medio | Mejora |
| 4 | Agregar workflow de CI con lint + typecheck + build en PRs | Hoy no hay ningún gate automático de calidad antes de mergear a main | S/M | Alto | Mejora |
| 5 | Corregir el mismatch de `CORS_ORIGIN` (wildcard documentado vs. matching exacto en código) | Puede estar bloqueando previews de Vercel o generando una config inútil en producción | S | Medio | Mejora |
| 6 | Limpiar código muerto detectado por lint (3 imports/variables sin usar) | Gratis, ya identificado | S | Bajo | Mejora |

### Mediano plazo (próximo sprint/mes)

| # | Ítem | Por qué importa | Esfuerzo | Impacto | Tipo |
|---|---|---|---|---|---|
| 1 | Implementar envío real de mail de confirmación de turno (Resend/SendGrid/similar) | Cumple una regla de negocio explícita hoy incumplida | M | Alto | Feature |
| 2 | Implementar recordatorio WhatsApp 6hs antes con scheduler real (cron/cola + WhatsApp Business API o Twilio) | Requiere tanto el proveedor como construir el mecanismo de disparo temporal, hoy inexistente | M/L | Alto | Feature |
| 3 | Mover el registro de Tesorería a la misma transacción que Cortes/Ventas/Merch, o agregar reconciliación/reintento cuando falla | Hoy puede haber cortes/ventas sin movimiento de tesorería asociado si algo falla post-commit | M | Alto | Mejora |
| 4 | Agregar paginación a los listados principales (clients, appointments, sales, cuts, articles) | Mayor riesgo de degradación de performance a medida que crece el volumen | M | Alto | Mejora |
| 5 | Code-splitting del frontend (`React.lazy` por rutas admin vs. portal público) | Reduce tiempo a interactivo, especialmente relevante durante el cold-start del backend en mobile | M | Alto | Mejora |
| 6 | Tests automatizados mínimos para lógica crítica (stock, descuentos, tesorería) | Es la lógica que maneja dinero real; hoy cero cobertura | M/L | Alto | Mejora |
| 7 | Endpoint de upload de imagen para Cortes + exposición pública de la foto al cliente final | Cumple el requisito explícito "imagen adjunta visible para cliente final" para cortes, hoy solo cumplido para artículos | M | Medio | Mejora |
| 8 | Migrar el JWT de `localStorage` a cookie `httpOnly` | Reduce superficie de robo de sesión vía XSS | M | Medio | Mejora |
| 9 | Agregar índices `@@index` en FKs de alto volumen (`clientId`, `barberoId`, `sellerId`, `articleId`, etc.) | Migración de Prisma de bajo riesgo, evita table scans a futuro | S/M | Medio | Mejora |

### Largo plazo / roadmap

| # | Ítem | Por qué importa | Esfuerzo | Impacto | Tipo |
|---|---|---|---|---|---|
| 1 | Migración de dependencias major (Prisma 5→7, React 18→19, Express 4→5, Vite 5→8) | Evita quedar en versiones sin soporte, en especial Prisma con dos majors de atraso | L | Medio | Mejora |
| 2 | Capa de caching (react-query/SWR en frontend) para catálogos y datos poco cambiantes | Reduce round-trips percibidos como lentitud, agrava con el cold-start | M | Medio | Mejora |
| 3 | Definir y aplicar una política única de soft-delete + auditoría (`createdBy`/`updatedBy`) en todos los modelos | Hoy inconsistente entre modelos (p. ej. `Cut` hard-delete vs. `Discount` soft-delete); mejora trazabilidad | M/L | Medio | Mejora |
| 4 | Resolver breakpoints intermedios (tablet) en el CSS del panel y portal público | Hoy solo hay un breakpoint mayor; layouts intermedios pueden ser subóptimos | M | Bajo | Mejora |

---

## 4. Riesgos abiertos / decisiones pendientes que requieren definición de negocio

1. **Proveedor de correo transaccional y de WhatsApp Business API** (`skills.md` §8): siguen sin decidir. No es solo elegir proveedor — hoy no existe ningún mecanismo de scheduling en el backend, así que además de la integración hay que construir la infraestructura de disparo temporal para el recordatorio de 6hs.
2. **Paleta de colores real vs. especificada**: `skills.md` §3 pide azul/rojo en modo claro y negro/dorado en modo oscuro; el código implementa verde/dorado en ambos modos, de forma consistente y bien ejecutada. Se necesita que negocio confirme cuál de los dos documentos (spec o código en producción) es el correcto, y actualizar el que quedó desactualizado.
3. **Módulos fuera de alcance comercial documentado**: Descuentos/cupones, Reportes exportables y Proveedores/Órdenes de compra (Plan Integral) están completamente implementados pero no aparecen en `skills.md` §5 ni en el contexto comercial §7. Se recomienda confirmar si están aprobados/cotizados por separado o si constituyen alcance no facturado que conviene formalizar retroactivamente en el documento comercial.
4. **Acceso de Barbero a Reportes/Compras bajo Plan Integral**: hoy `requirePlan('INTEGRAL')` no combina con restricción de rol, así que un Barbero puede acceder a reportes contables y gestión de compras si el plan lo habilita — contradice el criterio usado en el resto del sistema (Tesorería/Ventas vedadas a Barbero). Requiere una decisión explícita de negocio sobre si esto es intencional.
5. **Integración real de notificaciones fuera del repo**: no se puede verificar desde el código si el equipo tiene planeada o en curso alguna integración de mail/WhatsApp fuera de este monorepo (p. ej. un servicio externo). Requiere confirmación directa del equipo antes de asumir que el gap sigue abierto.
6. **`skills.md` §8 desactualizado**: 4 de las 6 decisiones pendientes que lista ya están resueltas en el código (almacenamiento de imágenes, código de turno único, permisos por ruta, modelo de parametrizados) — conviene actualizar el documento para reflejar el estado real y no perder de vista que solo quedan pendientes los dos proveedores de notificación.

---

*Alcance no cubierto por esta auditoría: no se verificó en runtime ningún proveedor externo (no hay ninguno conectado, según el código), no se ejecutaron pruebas de carga/performance reales, y no se auditó el contenido de las migraciones una por una más allá de lo relevante para índices y campos de auditoría.*
