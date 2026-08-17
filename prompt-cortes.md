# Prompt — Módulo Registro de cortes (backend real)

> Pegá este prompt en el chat de desarrollo, sobre el repo que ya tiene Parametrizados
> y Turnos implementados. Adjuntá `skills.md` si hace falta contexto.

---

Ya tenemos: auth+roles, Clientes, Parametrizados (con tipos de corte) y Turnos, todo
real. Ahora quiero implementar el backend real del **módulo Registro de cortes** y
conectarlo, reemplazando el mock correspondiente en el panel admin.

## Alcance funcional (según skills.md)

Cada barbero registra el corte realizado (tipo de corte + cliente). Estos datos
alimentan **Centro de Estadísticas** y **Tesorería** más adelante en el roadmap, así
que el modelo tiene que dejar esa data lista aunque esos módulos todavía no existan.

1. **Precio del tipo de corte**: para que un corte pueda generar un ingreso en
   Tesorería el día que se implemente ese módulo, el catálogo "tipo de corte" de
   Parametrizados necesita un campo de precio. Revisá si ya existe — si no, sumalo
   ahora con una migración (es una extensión chica sobre el módulo Parametrizados, no
   hace falta retocar el resto de ese módulo).
2. **Alta de corte**: barbero, cliente (buscado/reutilizado por teléfono, igual que en
   Turnos), tipo de corte, precio **al momento del corte** (snapshot — si el precio del
   catálogo cambia después, los cortes ya registrados no deben verse afectados), fecha.
3. **Vínculo opcional con un turno**: si el corte viene de un turno agendado, permitir
   asociarlo (`appointmentId` opcional) y marcar ese turno como completado al
   registrar el corte. Si es un cliente sin turno previo (walk-in), debe poder
   registrarse igual sin turno asociado.
4. **Gancho hacia Tesorería**: como el módulo Tesorería todavía no existe, dejá un
   `TreasuryService` (o similar) con un método tipo `recordIncomeFromCut` implementado
   como no-op/log por ahora — mismo patrón que usamos con `NotificationService` en
   Turnos — para conectarlo sin tocar este módulo cuando llegue su turno en el
   roadmap.

## Backend

- Modelo Prisma de `Cut` (corte): barbero, cliente, tipo de corte, precio snapshot,
  fecha, `appointmentId` opcional.
- Endpoint de alta (Barbero, Encargado, Dev).
- Endpoint de listado: Barbero ve solo los propios, Encargado/Dev ven todos (mismo
  criterio que Turnos).
- Si se asocia a un turno, validar que el turno pertenezca al mismo barbero/cliente y
  actualizar su estado a completado dentro de la misma transacción.

## Frontend

- Reemplazá el mock de Registro de cortes por la conexión real: selección de cliente
  (buscar por teléfono o crear), tipo de corte (desde Parametrizados), y opción de
  vincular un turno del día de ese barbero si existe.

Antes de escribir código, mostrame el modelo de `Cut` propuesto y cómo vas a manejar
el snapshot del precio, para que lo valide.
