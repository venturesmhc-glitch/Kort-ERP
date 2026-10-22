import { prisma, type Db } from '../../lib/prisma.js';
import { getTenantId } from '../../lib/tenantContext.js';
import type { UpdateSettingsInput } from './settings.schema.js';

// Una fila por tenant (tenantId es la propia primary key), mismo patron que
// AppointmentSettings. El upsert evita depender de un seed: la primera
// lectura ya crea la fila en BASICO. db es opcional para poder leerla desde
// dentro de la transaccion de StockService.applyMovement sin abrir una
// conexion aparte (ver stock.service.ts).
export function getOrganizationSettings(db: Db = prisma) {
  const tenantId = getTenantId();
  return db.organizationSettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

export function updateOrganizationSettings(input: UpdateSettingsInput) {
  const tenantId = getTenantId();
  return prisma.organizationSettings.upsert({
    where: { tenantId },
    create: { tenantId, plan: input.plan },
    update: { plan: input.plan },
  });
}
