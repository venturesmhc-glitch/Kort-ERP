# Prompt — Módulo Artículos y Stock (backend real)

> Pegá este prompt en el chat de desarrollo, sobre el repo que ya tiene Parametrizados,
> Turnos y Registro de cortes implementados. Adjuntá `skills.md` si hace falta contexto.

---

Ya tenemos auth+roles, Clientes, Parametrizados, Turnos y Registro de cortes reales.
Ahora quiero implementar el backend real del **módulo Artículos y Stock** y
conectarlo, reemplazando el mock correspondiente en el panel admin.

## Alcance funcional (según skills.md)

1. **CRUD de artículos**: nombre, descripción, tipo de producto (FK a Parametrizados),
   precio, imagen, stock actual, y un umbral mínimo opcional para alertas de stock
   bajo (el Dashboard del prototipo ya tiene un placeholder de "alertas de stock" que
   se puede alimentar de esto).
2. **Movimientos de stock**: ingreso y egreso manual, con historial (`StockMovement`:
   tipo, cantidad, fecha, motivo/referencia).
3. **Descuento automático**: Ventas (módulo siguiente) y la reserva de Merch en la
   landing (más adelante en el roadmap) todavía no existen, así que en vez de
   implementar el descuento directo, exponé un `StockService` con métodos
   `decreaseStock`, `reserveStock` e `increaseStock` que esos módulos van a consumir
   cuando se implementen — mismo patrón de "gancho" que usamos con
   `NotificationService` y `TreasuryService`. Para esta etapa alcanza con que el
   ingreso/egreso manual desde el panel use ese mismo servicio internamente.
4. **Imágenes**: el proveedor de almacenamiento de imágenes todavía no está definido
   (pendiente en `skills.md`). Para no bloquear esta etapa, implementá una
   abstracción `StorageService` (`uploadImage`, `getImageUrl`, `deleteImage`) con una
   implementación local a disco para desarrollo, de forma que cambiar a S3/Cloudinary
   más adelante sea solo escribir una nueva implementación de esa interfaz, sin tocar
   el resto del código.

## Permisos

Artículos y Stock no está en la lista de accesos del rol Barbero (que se limita a
Clientes, Turnos y Registro de cortes) — restringí lectura y escritura de este módulo
a **Encargado y Dev** únicamente.

## Backend

- Modelos Prisma: `Article` (con relación a tipo de producto de Parametrizados) y
  `StockMovement`.
- Endpoints CRUD de artículos (Encargado/Dev), endpoint de carga de imagen, y
  endpoints de movimiento manual de stock (ingreso/egreso).
- Endpoint de "artículos con stock bajo" para alimentar el Dashboard.
- Validación con Zod (cantidades no negativas, no permitir egreso mayor al stock
  disponible, etc.).

## Frontend

- Reemplazá el mock de Artículos y Stock por la conexión real: listado con imagen,
  alta/edición de artículo con carga de imagen, registro de movimientos manuales.
- Conectá el placeholder de alertas de stock del Dashboard al endpoint real.

Antes de escribir código, mostrame el modelo de `Article`/`StockMovement` propuesto y
la interfaz del `StorageService` (con su implementación local a disco), para que lo
valide.
