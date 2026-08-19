# Kort — Sistema de Gestión Integral para Barberías

Referencia técnica y funcional del proyecto. Sintetiza la propuesta comercial y las notas
funcionales/técnicas originales. Este documento es la fuente de verdad para diseñar prompts,
arquitectura y desarrollo — no es el documento comercial que se le entrega al cliente.

## 1. Resumen del proyecto

Sistema de gestión digital a medida para barberías/peluquerías: turnos, clientes, cortes,
stock, ventas, tesorería, jornadas laborales y estadísticas, todo en una plataforma propia,
parametrizable y sin comisiones por operación (a diferencia de plataformas de terceros).

Tres superficies:
- **Panel administrativo** (Dev / Encargado / Barbero)
- **Portal/landing de turnos** (cliente final agenda online)
- **Tienda de merchandising** (cosmética, indumentaria, accesorios), integrada al flujo de turno

## 2. Stack tecnológico

- **Frontend:** React + TypeScript, validación de formularios con Zod
- **Backend:** Node.js
- **Base de datos:** PostgreSQL
- **Autenticación/seguridad:** JWT, con middleware de autorización por rol en las rutas
- **Almacenamiento:** imágenes de cortes y productos (a definir proveedor: local/S3/similar)

## 3. Paleta de colores y estilo

- **Modo claro:** blanco y tonalidades de grises claros, detalles en azul y rojo (colores típicos
  de barbería).
- **Modo oscuro:** tonalidades de negro, detalles en dorado y tonalidades de blanco.
- Identidad visual configurable por barbería (parametrizable), con soporte de modo claro/oscuro
  en toda la app.

## 4. Roles y permisos

| Rol | Alcance |
|---|---|
| **Dev** | Acceso total. Único rol habilitado para designar otros "Dev". |
| **Encargado** | Acceso a todo el sistema **excepto** designar rol "Dev". Único con acceso a Jornadas Laborales y Centro de Estadísticas. |
| **Barbero** | Acceso limitado a: Clientes, Turnos y horarios de atención, Registro de cortes. |

Encargado y Barbero deben tener registrados: días de trabajo, horarios de atención (con
lapsos por turno, recomendado 30 min), nombre, apellido, DNI, mail, teléfono, domicilio.

**Sesión:** si un barbero hace logout (o queda inactivo) y pasan 2 horas sin actividad, se
cierra la sesión automáticamente.

## 5. Módulos

### 5.1 Dashboard
Resumen general del estado del sistema: turnos del día, ventas, alertas de stock y
desempeño del equipo.

### 5.2 Usuarios y roles
CRUD de usuarios internos (Dev/Encargado/Barbero) con los permisos descriptos en §4.

### 5.3 Clientes
- Alta **automática** al reservar un turno: se identifica por **relación unívoca de teléfono**.
  Si el teléfono ya existe, no se crea un cliente nuevo (se reutiliza el existente).
- Datos guardados: nombre, apellido, celular.
- CRUD manual completo también disponible desde el panel.

### 5.4 Turnos y horarios de atención
- El cliente ingresa nombre, apellido, teléfono y mail (opcional).
- Elige barbero y horario disponible (según días/horarios registrados por cada barbero).
- Selecciona tipo de corte (parametrizado).
- Antes de confirmar el turno, se le ofrece navegar la tienda de merchandising (elige entre
  "Solicitar turno" o "Ver mercancía").
- Al confirmar, se genera un **código de turno único (ID)**.
- Se envía **mail de confirmación** al momento de la reserva.
- Se envía **recordatorio por WhatsApp 6 hs antes** del turno con los datos correspondientes.
- Tras el turno, si el cliente compra un producto de merchandising, el stock se **reserva**
  en ese momento.

### 5.5 Registro de cortes
Cada barbero registra el corte realizado indicando tipo de corte y cliente. Estos datos
alimentan Centro de Estadísticas y Tesorería.

### 5.6 Artículos y stock
- CRUD de artículos.
- Ingreso y egreso manual de stock.
- Descuento automático de stock con cada venta o reserva de merchandising.
- El CRUD de artículos (y de cortes) debe permitir adjuntar una **imagen** visible para el
  cliente final.

### 5.7 Ventas
Flujo: selección de artículo → cantidad → precio → confirmación. Al ejecutarse, descuenta
stock automáticamente y registra el movimiento en Tesorería.

### 5.8 Tesorería
- Registro de costos fijos, costos variables e ingresos.
- Histórico de movimientos.
- Gráficos y análisis, incluyendo **obligatoriamente** el gráfico de **punto de equilibrio**
  (cuánto ingreso se necesita para no estar en pérdida).

### 5.9 Registro de jornadas laborales
- Calcula horas trabajadas por barbero: desde el primer login del día hasta el último logout.
- Muestra también la cantidad de cortes realizados ese día (estadística cruzada).
- Acceso **exclusivo** del Encargado (y Dev).

### 5.10 Centro de estadísticas
Panel de gráficos y análisis sobre clientes, barberos, cortes y ventas. Acceso **exclusivo**
del Encargado (y Dev).

### 5.11 Panel de parametrizados
Regla transversal del proyecto: **nada hardcodeado**. Debe permitir parametrizar como
mínimo:
- Tipos de corte
- Tipos de producto
- Categorías de costos
- Categorías de ingresos
- Cualquier otro catálogo que surja como necesario para escalabilidad e independencia
  del Encargado respecto de los desarrolladores.

### 5.12 Tienda de merchandising
Catálogo de cosmética, indumentaria y accesorios, visible desde la landing. Reserva de
stock al momento de la compra (antes o después del turno).

## 6. Reglas de negocio transversales

- **Sin hardcodeo:** todo catálogo/config debe vivir en el Panel de Parametrizados.
- **Cliente único por teléfono:** el teléfono es la clave de identificación de clientes.
- **Stock siempre consistente:** toda venta o reserva de merchandising descuenta stock
  en el mismo flujo transaccional.
- **Cortes como fuente de estadística:** cada corte registrado alimenta tesorería y
  estadísticas; no es un registro aislado.
- **Notificaciones:** mail al confirmar turno; WhatsApp 6 hs antes como recordatorio.
- **Imágenes:** cortes y productos de merchandising deben soportar imagen adjunta.
- **Multi-tenant implícito por identidad visual:** cada barbería tiene su propia paleta
  (modo claro/oscuro), pero el plan comercial actual es de **1 barbería/local** por
  implementación (no multi-sucursal salvo cotización aparte).

## 7. Contexto comercial (resumen, para no perder de vista el alcance)

- **Plan Kort ERP:** USD 800, pago único por implementación (1 barbería/local), incluye
  30 días de mantenimiento inicial y capacitación.
- **No incluido por defecto:** hosting, dominio, base de datos, WhatsApp Business API,
  correo transaccional, pasarelas de pago, facturación electrónica, hardware — todo a
  cargo del cliente salvo que se contrate expresamente.
- **Mantenimiento posterior opcional:** Básico USD 60/mes (hasta 2 ajustes menores),
  Integral USD 80/mes (hasta 5 ajustes menores + prioridad).
- **Licencia:** se otorga uso del sistema implementado, no propiedad intelectual del
  código ni derecho de reventa, salvo acuerdo escrito.
- Cualquier funcionalidad, integración o cambio de flujo no contemplado en este
  documento se cotiza y aprueba por separado antes de implementarse.

## 8. Pendientes / decisiones a tomar antes de codear

Actualizado 2026-08-19 (ver `docs/auditoria-2026-08-19.md`): de las 6 decisiones originales,
4 ya estan resueltas en el codigo. Quedan pendientes solo las dos de abajo, y de esas dos
la parte de codigo (integracion + scheduler) tambien esta resuelta - lo unico que falta es
el alta de cuenta del lado del proveedor, que es un paso manual e inevitable (no de este
repo).

- **Proveedor de correo transaccional:** resuelto en codigo via Resend (ver
  `backend/src/lib/notifications/emailProvider.ts`). Falta cargar `RESEND_API_KEY` en
  produccion (alta de cuenta en resend.com, ver `.env.production.example`).
- **Proveedor de WhatsApp Business API:** resuelto en codigo via WhatsApp Cloud API (Meta),
  incluyendo el mecanismo de scheduling que faltaba (recordatorio 6hs antes, ver
  `backend/src/modules/notifications/scheduler.service.ts` + modelo `ScheduledNotification`).
  Falta el alta de cuenta de Meta Business + aprobacion de la plantilla de mensaje (proceso
  manual de Meta, puede tardar hasta 24hs) y cargar `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`
  en produccion.
- ~~Proveedor de hosting/infraestructura y almacenamiento de imágenes~~ — resuelto: Render
  (backend) + Vercel (frontend) + Supabase Storage en produccion, disco local en dev.
- ~~Definir si el "código de turno único" es correlativo, hash corto o UUID~~ — resuelto:
  alfanumerico de 6 caracteres sin ambigüedad visual, no correlativo, no UUID (ver
  `appointments.service.ts`).
- ~~Definir estructura exacta de permisos por ruta~~ — resuelto: middleware `verifyToken` +
  `authorize(...)` por rol, consistente en los 18 modulos de rutas.
- ~~Definir el modelo de datos de "parametrizados"~~ — resuelto: tabla generica
  `ParameterCategory`/`ParameterItem`, sin catalogos hardcodeados.
