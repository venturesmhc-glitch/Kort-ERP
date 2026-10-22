import { Prisma, PrismaClient } from '@prisma/client';
import { getTenantId } from './tenantContext.js';

// Cliente sin ningun scoping, para los pocos puntos que corren antes (login,
// ver auth.service.ts) o fuera (scheduler de recordatorios, ver
// scheduler.service.ts) de tener un tenant resuelto, y que por diseno
// necesitan ver mas de un tenant a la vez.
export const prismaUnscoped = new PrismaClient();

// Modelos tenant-scoped: toda lectura (findMany/findFirst/findUnique/
// count/aggregate/groupBy) y todo where de update/updateMany/delete/
// deleteMany/upsert sobre estos modelos se filtra automaticamente por el
// tenant activo (ver tenantContext.ts). Deliberadamente NO incluye `Tenant`
// (es la raiz, no tiene tenantId) ni `ScheduledNotification` (no tiene
// columna tenantId propia - el scheduler la recorre entera a proposito, ver
// scheduler.service.ts).
const TENANT_SCOPED_MODELS = new Set<Prisma.ModelName>([
  'User',
  'Client',
  'WorkSchedule',
  'AppointmentSettings',
  'Appointment',
  'Cut',
  'ParameterCategory',
  'ParameterItem',
  'Article',
  'StockMovement',
  'Sale',
  'SaleItem',
  'WorkSession',
  'TreasuryEntry',
  'OrganizationSettings',
  'Proveedor',
  'ProveedorProducto',
  'OrdenCompra',
  'OrdenCompraItem',
  'BusinessSettings',
  'Discount',
]);

// Operaciones de lectura/actualizacion/borrado: Prisma permite agregar
// campos no-unicos adicionales al `where` de findUnique/update/delete sin
// romper el tipado (WhereUniqueInput admite filtros extra ademas del campo
// unico), asi que inyectar tenantId aca es seguro y no requiere tocar cada
// service. Los create/createMany/upsert (`data`) quedan afuera a proposito:
// Prisma SI exige tenantId en el tipo de esos inputs, asi que se setea a
// mano en cada service con getTenantId() - preferible a forzarlo con `any`
// aca, porque un create sin tenantId queda como error de compilacion en vez
// de un bug silencioso.
const SCOPED_WHERE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'count',
  'aggregate',
  'groupBy',
  'upsert',
]);

export const prisma = prismaUnscoped.$extends({
  name: 'tenantScoping',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || !TENANT_SCOPED_MODELS.has(model) || !SCOPED_WHERE_OPERATIONS.has(operation)) {
          return query(args);
        }
        const tenantId = getTenantId();
        const typedArgs = args as { where?: Record<string, unknown> };
        typedArgs.where = { ...typedArgs.where, tenantId };
        return query(args);
      },
    },
  },
});

// Tipo de "cliente o transaccion" para funciones que reciben opcionalmente
// un `tx` de $transaction (ver StockService, TreasuryService, etc.): el
// cliente extendido con tenantScoping (arriba) no es estructuralmente el
// mismo tipo que Prisma.TransactionClient (generado para el cliente base
// sin extender), asi que esas funciones deben tipar su parametro `tx` con
// este alias en vez de Prisma.TransactionClient a secas.
export type Db = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'>;
