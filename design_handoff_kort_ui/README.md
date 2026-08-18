# Handoff: rediseño de UI de Kort (ERP para barberías y centros de estética)

## Overview

Kort es un ERP para barberías y centros de estética (monorepo `backend` Express+Prisma / `frontend` React+TS+Vite, npm workspaces). Este handoff cubre el rediseño visual completo del frontend: base visual, layout administrativo, dashboard, agenda, estadísticas y el wizard público de reserva de turnos.

El objetivo del rediseño: uso mayoritario en celular (barbero/estilista y encargado), estética moderna sin apariencia de "template", y separación clara entre el panel del equipo y la reserva del cliente final (el cliente nunca ve un login).

## About the design files

Los archivos de este bundle son **referencias de diseño hechas en HTML** — prototipos que muestran el aspecto y comportamiento buscados, no código de producción para copiar tal cual. La tarea es **recrear estos diseños dentro del entorno del repo** (React 18 + TypeScript + Vite, CSS con variables y clases globales en `frontend/src/theme/theme.css` y `frontend/src/styles/layout.css`), respetando sus patrones actuales: componentes por módulo en `frontend/src/modules/<modulo>/`, `AdminLayout` con `react-router-dom`, contextos `AuthContext` / `BusinessSettingsContext` / `PlanContext`, y las funciones `*.api.ts` existentes.

**No cambiar la lógica de datos.** Los módulos, tipos y llamados a la API se mantienen; el cambio es de presentación (marcado + CSS) y, donde se indica, de estructura de navegación.

## Fidelity

**Alta fidelidad.** Colores, tipografías, espaciados, radios y estados están definidos con valores exactos abajo. Recrear la UI pixel-perfect usando CSS variables + clases, tal como está organizado hoy el repo (no CSS Modules, no Tailwind).

## Enfoque de estilos

Mantener el sistema actual:

- `frontend/src/theme/theme.css` — variables de tema (claro/oscuro) y resets. Se reemplaza la paleta.
- `frontend/src/styles/layout.css` — clases de layout y componentes. Se amplía.
- `frontend/src/styles/public.css` — estilos del sitio público / wizard.
- `useBusinessTheme()` sigue pisando `--color-primary` / `--color-secondary` / `--color-accent` solo en páginas públicas. El panel administrativo conserva la identidad de Kort.

---

## Design tokens

### Paleta (tema claro — por defecto)

| Token | Valor | Uso |
|---|---|---|
| `--color-bg` | `#f6f3ec` | Fondo de la app (hueso cálido) |
| `--color-surface` | `#fffdf8` | Tarjetas, filas, inputs |
| `--color-surface-alt` | `#f2eee3` | Bloques secundarios, filas alternas |
| `--color-border` | `#e5e0d5` | Bordes de tarjetas e inputs |
| `--color-border-strong` | `#ddd6c8` | Bordes de botones secundarios, inputs en foco off |
| `--color-text` | `#1b1a17` | Texto principal |
| `--color-text-muted` | `#6d675d` | Texto secundario |
| `--color-text-faint` | `#8d867a` | Etiquetas mono, ayudas |
| `--color-primary` | `#22423a` | Verde profundo: sidebar, botones primarios, bloques destacados |
| `--color-primary-contrast` | `#f6f3ec` | Texto sobre primario |
| `--color-primary-soft` | `#8aa79a` | Verde claro para gráficos |
| `--color-accent` | `#c08a3e` | Ámbar: acciones destacadas, FAB, "ahora", series de gráficos |
| `--color-accent-contrast` | `#241a08` | Texto sobre ámbar |
| `--color-accent-ink` | `#a2762f` | Texto ámbar sobre fondos claros |
| `--color-accent-bg` | `#f7efe0` | Fondo de avisos ámbar |
| `--color-accent-border` | `#e9d9b8` | Borde de avisos ámbar |
| `--color-danger` | `#9d4b30` | Alertas de stock, cancelaciones |
| `--color-danger-ink` | `#8a4429` | Texto de alerta |
| `--color-danger-bg` | `#f3e7e2` | Fondo de alerta |
| `--color-danger-border` | `#e6cec5` | Borde de alerta |
| `--color-success` | `#3d6b5e` | Estados completados, links de acción |

Colores auxiliares usados en gráficos: `#22423a`, `#c08a3e`, `#8aa79a`, `#e2dcce` (en ese orden para segmentos de "mix de servicios").

### Paleta (tema oscuro)

Mantener el toggle existente (`ThemeProvider` + `[data-theme='dark']`):

| Token | Valor |
|---|---|
| `--color-bg` | `#101214` |
| `--color-surface` | `#171a1d` |
| `--color-surface-alt` | `#1c2124` |
| `--color-border` | `#24282c` |
| `--color-text` | `#e9edf0` |
| `--color-text-muted` | `#8b959c` |
| `--color-primary` | `#8aa79a` |
| `--color-primary-contrast` | `#0c1012` |
| `--color-accent` | `#c08a3e` |

### Tipografía

- **Familia principal:** `'Space Grotesk', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- **Familia numérica / etiquetas técnicas:** `'IBM Plex Mono', ui-monospace, Menlo, monospace` — horas, importes en tablas, códigos de turno, etiquetas en mayúscula.
- Cargar desde Google Fonts en `frontend/index.html`:
  `https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap`

Escala (mobile / desktop):

| Rol | Tamaño | Peso | Notas |
|---|---|---|---|
| Título de pantalla | 22–26px | 700 | `letter-spacing:-.01em` a `-.02em` |
| Título de sección de escritorio | 23px | 700 | |
| Número grande (KPI) | 30–34px | 700 | `line-height:1.1` |
| Subtítulo / card title | 14–15.5px | 700 | |
| Cuerpo | 13–14px | 400–600 | |
| Secundario | 11.5–12.5px | 400 | `--color-text-muted` |
| Etiqueta mono | 10–11.5px | 400–600 | mayúsculas, `letter-spacing:.08em–.12em` |
| Input mobile | 16px | 400 | nunca menos de 16px, evita el zoom en iOS |

### Espaciado, radios, sombras

- Padding de pantalla mobile: `20–22px` horizontal.
- Gaps verticales: `9px` entre ítems de lista, `14px` entre bloques, `20px` entre secciones.
- Radios: inputs y botones `12–14px`; tarjetas `16–22px`; píldoras `99px`; iconos cuadrados `9–14px`.
- Bordes: `1px solid var(--color-border)`; `1.5px` cuando el campo está activo.
- Sombra de tarjeta flotante: `0 10px 34px rgba(34,66,58,.16)`.
- Altura mínima táctil: 44px (los botones primarios usan `padding:16–17px`).

---

## Pantallas

### 1. Login del equipo (`modules/auth/LoginPage.tsx`)

**Propósito:** acceso exclusivo del personal. **El cliente final no pasa por acá y no debe existir ningún botón de "reservar turno como cliente".** El cliente entra por el link público del local y cae directo en el paso 1 del wizard.

**Layout:** columna centrada verticalmente, padding `0 30px 70px`, gap 32px sobre `--color-bg`.

- Cabecera: cuadrado 26×26 `border-radius:8px` en `--color-primary` + texto "Kort" 15px/700.
- Título "Acceso del equipo" 29px/700, `line-height:1.15`.
- Bajada: "Ingresá con la cuenta que te asignó el encargado del local." 13px, muted.
- Campos con **borde inferior únicamente** (`border-bottom:1.5px solid`), sin caja: etiqueta mono 11.5px en mayúscula + input 15.5px transparente. El campo activo usa borde `--color-primary`.
- Toggle "Mantener sesión iniciada": pista 40×23 `border-radius:99px` en `--color-primary`, perilla 17×17 blanca a 3px del borde.
- Botón "Ingresar": ancho completo, `padding:16px`, `border-radius:12px`, `--color-primary`.
- "Olvidé mi contraseña" 12.5px muted, centrado.
- Nota al pie separada por `1px solid var(--color-border)`: "Los clientes no pasan por esta pantalla: reservan desde su link y van directo al turno."

### 2. AdminLayout — sidebar de íconos retráctil (`layouts/AdminLayout.tsx`, `styles/layout.css`)

**Escritorio.** Sidebar en `--color-primary` (`#22423a`) con texto `#e9e5d9`:

- Ancho **68px colapsada**, **228px expandida**. Se expande con `mouseenter` y se colapsa con `mouseleave`; transición `width .22s ease`. Las etiquetas hacen fade con `opacity .18s ease` (`opacity:0` colapsada).
- Padding `18px 14px`, gap 20px, `overflow:hidden`, `white-space:nowrap` en las etiquetas para que no se rompan durante la animación.
- Logo: cuadrado 28×28 `border-radius:9px` en `--color-accent`, letra "K" 14px/700 en `--color-accent-contrast`; al lado "Kort" 15px/700.
- Ítems: `display:flex; align-items:center; gap:12px; padding:9px 6px; border-radius:10px`. Ícono 18×18 primero (`flex:none`), etiqueta 13.5px después. Inactivo: `color:rgba(233,229,217,.72)`. Activo: `background:rgba(255,255,255,.12)`, texto pleno, peso 600. Hover: `background:rgba(255,255,255,.07)`.
- Badge de stock bajo: píldora `--color-danger`, texto blanco 10px/700, `padding:1px 7px`, alineada a la derecha del ítem "Artículos y stock" (solo visible con la sidebar expandida; colapsada, mostrar un punto de 6px en la esquina superior derecha del ícono).
- Pie: avatar 28×28 `border-radius:9px` con iniciales + nombre 12.5px/600 y rol 10.5px.
- Accesibilidad: cada ítem lleva `aria-label` y `title` con la etiqueta, para que la versión colapsada siga siendo navegable; en foco por teclado la sidebar debe expandirse (`focus-within`).

**Íconos.** Line icons geométricos de 18×18, `stroke:currentColor`, `stroke-width:1.4`, `fill:none`. **Sin emojis.** Usar un set open source consistente (Lucide o Phosphor, importado como componentes SVG) o los trazos del prototipo:

| Ítem | Ícono |
|---|---|
| Inicio | cuatro cuadrados 5.5×5.5 con `rx:1` |
| Agenda y horarios | rectángulo 13×12 `rx:2` + línea a y=7 + dos ticks superiores |
| Clientes | círculo r=3 en (9,6) + arco `M3.5 15.5c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5` |
| Servicios registrados | tres líneas horizontales (15,15,11 de ancho) |
| Artículos y stock | caja isométrica `M2.5 6l6.5-3.2L15.5 6v6L9 15.2 2.5 12z` + aristas |
| Ventas | etiqueta `M9.5 2.5l6 6-7 7-6-6v-7z` + círculo r=1.3 |
| Tesorería | rectángulo 13×9 `rx:2` + círculo r=2 al centro |
| Estadísticas | tres barras verticales de distinta altura |
| Configuración | círculo r=2.6 + ocho radios |

**Mobile (< 900px).** La sidebar desaparece y se reemplaza por una **tab bar inferior de 3 destinos + FAB**:

- Contenedor: `padding:12px 20px 24px`, píldora `background:var(--color-surface); border:1px solid var(--color-border); border-radius:99px; padding:5px`.
- Tabs "Hoy", "Agenda", "Caja": `flex:1`, `padding:10px 0`, 12px/600. Activo: fondo `--color-primary`, texto `--color-primary-contrast`, `border-radius:99px`, peso 700.
- FAB: 48×48 circular, `--color-accent`, signo "+" 26px, fuera de la píldora a la derecha. Abre la hoja de acciones rápidas (registrar servicio, nueva venta, cliente nuevo, nuevo turno).
- El resto de los módulos (stock, tesorería, proveedores, usuarios, jornadas, parametrizados, estadísticas, configuración) viven detrás de un "Más" accesible desde el avatar del header.

**Header de escritorio:** `padding:18px 26px`, fondo `--color-surface`, borde inferior. Izquierda: título 23px/700 + subtítulo 12.5px muted ("Miércoles 12 de agosto · 14 turnos · 78% de ocupación"). Derecha: botón secundario ("Nueva venta": borde `--color-border-strong`, fondo transparente, `border-radius:11px`, `padding:11px 15px`, 13px/600) y primario ("Nuevo turno": `--color-primary`, 13px/700).

### 3. Inicio del día (`modules/dashboard/DashboardPage.tsx`)

Reemplaza los `stat-tile` + `card-grid` actuales. Orden en mobile:

1. **Saludo:** fecha en mono 11.5px mayúscula ("MIÉ 12 DE AGOSTO") + "Hola, Ana" 22px/700; a la derecha avatar 36×36 `border-radius:12px` fondo `#e6e1d5`, iniciales 12.5px/700 en `--color-primary`.
2. **Dos KPI lado a lado** (gap 11px, `border-radius:18px`, padding 16px): "Turnos hoy" sobre `--color-primary` con texto claro (valor 31px/700 + "3 atendidos" 11px); "Cobrado" sobre `--color-surface` con borde (valor 31px/700 + "9 operaciones").
3. **Turno en curso** — tarjeta `--color-surface`, borde, `border-left:3px solid var(--color-accent)`, `border-radius:20px`, padding 18px: etiqueta "EN CURSO" 11px/700 en `--color-accent-ink` con `letter-spacing:.1em`, rango horario en mono a la derecha, nombre 17px/700, servicio + precio 12.5px muted, barra de progreso 5px (`background:#ece7db`, relleno `--color-accent`), y dos botones: primario "Registrar servicio" (`flex:1`) y secundario "Cobrar".
4. **Siguientes** — lista de filas 13px/15px padding, `border-radius:16px`: hora en mono 12.5px (ancho fijo 42px), nombre 14px/600, servicio + profesional 11.5px muted. La fila de cliente sin ficha usa fondo `--color-accent-bg`, borde `--color-accent-border` y texto `--color-accent-ink` ("Falta cargar la ficha").
5. **Alerta de stock** — banda `--color-danger-bg` / borde `--color-danger-border`, punto de 7px, texto 12.5px y link "Ver".

**Escritorio:** grilla de 4 KPI arriba, agenda del día a la izquierda (2/3) y columna derecha con "Pendientes" (turnos a confirmar / fichas incompletas / artículos bajo mínimo) y "Equipo hoy" (barras de progreso 6px por profesional).

Los datos salen de los mismos requests que hoy: `listTurnosRequest`, `listStockBajoRequest`, `listVentasRequest`, `listCortesRequest`.

### 4. Agenda — timeline por profesional (`modules/turnos/TurnosPage.tsx`)

Sustituye la tabla actual de la pestaña "Agenda" (la pestaña "Horarios de atención" mantiene su tabla, restyleada).

**Mobile:** una columna, filtro de profesional en píldoras arriba ("Ana / Ivo / Cami / Todos"; activa en `--color-primary`), fecha en mono a la derecha.

- Riel de horas a la izquierda (ancho 42px, mono 11px, muted), una hora cada **66px**.
- Zona de eventos con grilla de fondo: `background:repeating-linear-gradient(#e7e2d6 0 1px, transparent 1px 66px)`.
- Eventos posicionados en absoluto, `top = (minutosDesdeInicio / 60) * 66`, altura proporcional a la duración: `border-radius:14px`, padding `10px 13px`, nombre 13.5px/700, detalle 11.5px.
  - Confirmado/completado: `--color-surface` + borde.
  - En curso: `--color-primary` con texto claro y barra de progreso interna 4px en `--color-accent`.
  - A confirmar: `--color-accent-bg` + borde `--color-accent-border`, detalle en `--color-accent-ink`.
  - Hueco libre: `border:1px dashed #d5cec0`, texto 12px muted, tocable para agendar.
- Línea "AHORA": regla de 1.5px en `--color-accent` con etiqueta mono 9.5px a la derecha, posicionada según la hora actual.

**Escritorio:** mismo timeline con **una columna por profesional** dentro de una tarjeta `border-radius:20px`. Cabecera de columna de 42px con el nombre 12.5px/700 y borde inferior; riel de horas de 58px; separadores verticales `1px solid #efeadf`; eventos con `left:8px; right:8px`. Columna lateral de 284px con "Cobrado hoy" (bloque `--color-primary`), "Pendientes" y "Equipo hoy".

El cambio de estado del turno (hoy un `<select>` en la tabla) pasa a un menú contextual en el evento: Confirmar / En curso / Completado / Cancelado, con los mismos valores de `TURNO_ESTADO_LABELS` y `updateTurnoEstadoRequest`.

### 5. Estadísticas (`modules/estadisticas/EstadisticasPage.tsx`)

- Cabecera: título 22px/700 + selector de período en píldora ("Agosto"), o tabs "Mes / Trimestre / Año".
- **Bloque de facturación** sobre `--color-primary`, `border-radius:22px`, padding 20px: etiqueta 11.5px, valor 33px/700, píldora de variación en `--color-accent` ("+12,4%") y leyenda "vs julio". Gráfico de líneas SVG de 96px de alto, `preserveAspectRatio:none`: serie actual `stroke:var(--color-accent)` 2.5px, año anterior `stroke:rgba(242,239,230,.28)` 1.5px. Etiquetas de eje en mono 10px.
- **Dos tiles** (ticket promedio, ocupación): `--color-surface`, valor 21px/700.
- **Mix de servicios**: barra apilada de 11px `border-radius:99px` con los cuatro colores de gráfico, más leyenda de cuadrados de 9px con porcentaje a la derecha.
- **Ranking por profesional** (escritorio): tabla con nombre, cantidad de servicios y facturado — números en `IBM Plex Mono`, alineados a la derecha.

Reutilizar el `BarChart.tsx` existente ajustando colores a los tokens, o reemplazarlo por el SVG de líneas descrito.

### 6. Wizard público de reserva (`modules/public-turnos/TurnoWizardPage.tsx`, `styles/public.css`)

**Regla central:** el cliente llega por el link del local **directo al paso 1**. Nada de elegir entre iniciar sesión y reservar; el login es una ruta aparte, sin link visible desde el flujo público.

Se conservan los pasos actuales (`STEP_LABELS`) pero cambia la presentación: en lugar de la lista `wizard-steps`, una **barra de progreso de 5 segmentos** (`height:3px`, `border-radius:99px`, gap 5px; completados en `--color-primary`, pendientes en `--color-border-strong`) más una etiqueta mono "PASO N DE 5 · <TÍTULO>".

Cabecera del paso 1: cuadrado 22×22 en `--color-primary` + nombre del local (de `BusinessSettingsContext`) + dirección alineada a la derecha 11.5px muted. En los pasos 2 a 5, flecha "←" 19px + "Reservá tu turno" 13px/600.

Cada paso ocupa la altura completa con el botón primario fijo abajo (`padding:0 22px 26px`, botón `padding:17px`, `border-radius:14px`).

1. **Tus datos** — nombre, apellido, teléfono (obligatorios) y email (opcional, placeholder "Para recibir la confirmación"). Inputs 16px con caja: `padding:13px 14px`, `border-radius:12px`, fondo `--color-surface`. Etiquetas mono 11.5px en mayúscula. Nota: "Te avisamos por WhatsApp 6 horas antes del turno." Validación con el `clienteStepSchema` actual; el error se muestra bajo el campo, 12px en `--color-danger`.
2. **Profesional** — tarjetas de 15px padding, `border-radius:18px`, avatar 46×46 `border-radius:14px` con iniciales, nombre 15.5px/700 y especialidad 12px. Seleccionada: fondo `--color-primary`, texto claro, punto de 20px en `--color-accent` a la derecha. Última opción "Me da igual — el primero disponible" con borde punteado (si se elige, resolver el barbero en el paso de horario). El CTA refleja la elección: "Continuar con Ana".
3. **Fecha y horario** — fila de 5 días (`border-radius:14px`, día abreviado 10.5px + número 16px/700; seleccionado en `--color-primary`; cerrado con `opacity:.5`). Slots de `listSlotsDisponiblesRequest` agrupados en "MAÑANA" y "TARDE", grilla de 3 columnas, `padding:13px 0`, hora en mono 14px. Ocupado: fondo `--color-surface-alt`, texto `#b3aa9a`, `text-decoration:line-through`, no clickeable. Seleccionado: `--color-primary`. CTA: "Continuar · jue 13, 15:30".
4. **Servicio** — lista de servicios (`listPublicCatalogItemsRequest('tipos-corte')`) con nombre 14.5px/700, duración 11.5px muted y precio en mono a la derecha. Seleccionado en `--color-primary`. Aviso ámbar cuando la duración del servicio excede el slot elegido.
5. **Confirmar** — tarjeta resumen con "CUÁNDO" (19px/700), "CON" y "SERVICIO" en dos columnas, separadores `1px solid #eee9dd`, total estimado en mono 19px y la línea "Se abona en el local. <nombre> · <teléfono>". Debajo, banda ámbar opcional "¿Querés ver la tienda?" con botón "Ver" (equivale al `handleVerMercancia` actual, que guarda el draft y navega a `/tienda?turno=1`). Nota de política de cancelación. Botones: "Confirmar turno" (primario) y "Cambiar horario" (secundario).
6. **Turno confirmado** — pantalla completa en `--color-primary`: círculo 44px en `--color-accent` con check SVG, título 30px/700, bloque translúcido (`background:rgba(255,255,255,.07)`, borde `rgba(255,255,255,.12)`, `border-radius:20px`) con el código en mono 30px `letter-spacing:.06em` en `--color-accent` y las tres filas cuándo / con / servicio. Texto: "Te mandamos la confirmación por mail y un recordatorio por WhatsApp 6 horas antes." Acciones: "Agendar en mi calendario" (ámbar), "Cómo llegar" (contorno) y "Cancelar o reprogramar" (texto).

---

## Componentes sueltos

| Componente | Especificación |
|---|---|
| Botón primario | `--color-primary`, texto `--color-primary-contrast`, `border-radius:12–14px`, `padding:16px` (mobile ancho completo) o `11px 15px` (desktop), 13–15px/700, sin borde. Hover: `filter:brightness(1.08)`. Disabled: `opacity:.45`. |
| Botón secundario | Fondo transparente, `1px solid var(--color-border-strong)`, texto `--color-text`, mismos radios, peso 600. |
| Botón de acento | `--color-accent` sobre `--color-accent-contrast`, para FAB y CTA del cliente. |
| Card | `background:var(--color-surface); border:1px solid var(--color-border); border-radius:18–22px; padding:16–20px`. Sin sombra dentro de la app; la sombra se reserva para hojas flotantes. |
| Tile de KPI | Card con etiqueta 11.5px muted + valor 21–31px/700. La variante destacada invierte a `--color-primary`. |
| Badge de estado | Píldora `border-radius:99px`, `padding:3px 9px`, 10.5px/700, mayúsculas. Completado: `#eef0e6`/`#3d6b5e`. En curso: `--color-primary` sobre claro. A confirmar: `--color-accent-bg`/`--color-accent-ink`. Cancelado / stock crítico: `--color-danger-bg`/`--color-danger`. |
| Tabla de datos | Encabezado en mono 10px mayúscula `--color-text-faint`; filas `padding:10px 24px`, `border-bottom:1px solid var(--color-border)`; números en `IBM Plex Mono` alineados a la derecha; fila destacada con `--color-surface-alt`. En mobile, cada fila se convierte en tarjeta apilada (no scroll horizontal). |
| Input | `padding:13px 14px`, `border:1px solid var(--color-border-strong)`, `border-radius:12px`, fondo `--color-surface`, 16px. Foco: borde `1.5px solid var(--color-primary)`. Etiqueta mono 11.5px mayúscula, gap 7px. |
| Toggle | Pista 40×23 `border-radius:99px`; apagado `--color-border-strong`, encendido `--color-primary`; perilla 17×17 blanca, transición `.18s`. |
| Tab bar mobile | Ver AdminLayout. |
| Hoja de acciones | Sube desde abajo, `border-radius:24px 24px 0 0`, handle 36×4 `border-radius:99px`, acciones en píldoras. |
| Toast | Mantener `ToastProvider`; actualizar a `border-radius:14px`, borde izquierdo 3px en `--color-success` / `--color-danger`. |

## Interacciones y comportamiento

- **Sidebar:** expandir en `mouseenter` / `focus-within`, colapsar en `mouseleave`. `transition: width .22s ease` en el contenedor y `opacity .18s ease` en las etiquetas. Respetar `prefers-reduced-motion` (sin transición, cambio inmediato).
- **Timeline:** tap en un hueco abre el alta de turno con fecha y hora precargadas; tap en un evento abre el detalle con las acciones de estado; la vista arranca centrada en la hora actual.
- **Registrar servicio:** desde el turno en curso o el FAB; formulario en hoja inferior con servicio, profesional, importe, medio de pago y productos usados (descuentan stock) — usa `CorteForm` / `VentaForm` existentes.
- **Wizard:** cada paso valida antes de avanzar; el botón primario queda deshabilitado hasta que hay selección; "←" vuelve un paso sin perder datos (el draft ya se persiste en `turno-wizard.types`).
- **Estados de carga:** skeletons con el color `--color-surface-alt` en las tarjetas, en vez del texto "Cargando..." actual.
- **Estados vacíos:** texto 13px muted + acción sugerida; nunca una tabla vacía.
- **Responsive:** breakpoint único en 900px. Debajo: una columna, sidebar oculta, tab bar visible, tablas convertidas en tarjetas. Arriba: sidebar de íconos + grillas de 2 a 4 columnas.

## Estado y datos

Sin cambios en el modelo. Estado nuevo solo de presentación:

- `AdminLayout`: `sidebarExpanded: boolean` (hover/foco).
- `TurnosPage`: `profesionalFiltro: string | 'todos'`, `fechaSeleccionada: string`, `turnoAbierto: Turno | null`.
- `DashboardPage`: derivar "turno en curso" y "siguientes" de `listTurnosRequest` comparando con la hora actual.
- `TurnoWizardPage`: mantiene `step`, `cliente`, `barberoId`, `fecha`, `hora`, `tipoCorteId` y el draft en localStorage.
- Roles: se conserva el filtrado por `Role` en la navegación y `ProtectedRoute`. En mobile, el barbero ve solo Hoy / Agenda / Clientes; el encargado suma Caja y "Más".

## Assets

- Tipografías: Google Fonts (Space Grotesk, IBM Plex Mono). Si el despliegue debe funcionar sin CDN, autohospedarlas en `frontend/public/fonts` con `@font-face`.
- Íconos: **no hay assets propios**. Usar un set open source (Lucide / Phosphor) con `stroke-width:1.4` y tamaño 18, o replicar los trazos descritos arriba. **Sin emojis en ninguna parte de la UI.**
- Imágenes de producto / merch: los slots existentes (`row-thumb`, `image-upload-preview`) se mantienen, con `border-radius:12px`.

## Files

- `Kort Mockups.dc.html` — todos los mockups. Se abre en el proyecto de diseño; contiene, de arriba hacia abajo: turno 3 (wizard del cliente, 6 pantallas), turno 2 (modelo elegido **2a**: login, inicio, agenda, estadísticas y escritorio con sidebar retráctil), turno 1 (los 4 modelos explorados) y turno 0 (recreación de la UI actual del repo, como referencia de contraste).
- El diseño a implementar es **2a** (panel) + **3a** (wizard del cliente). Los modelos 1a, 1b, 1c y 1d quedan solo como historial de exploración.
