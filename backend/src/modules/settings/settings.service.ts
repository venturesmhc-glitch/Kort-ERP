import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import type { UpdateSettingsInput } from './settings.schema.js';

type Db = Prisma.TransactionClient | typeof prisma;

// Fila unica (id fijo en 1), mismo patron que AppointmentSettings. El upsert
// evita depender de un seed: la primera lectura ya crea la fila en BASICO.
// db es opcional para poder leerla desde dentro de la transaccion de
// StockService.applyMovement sin abrir una conexion aparte (ver
// stock.service.ts).
export function getOrganizationSettings(db: Db = prisma) {
  return db.organizationSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

export function updateOrganizationSettings(input: UpdateSettingsInput) {
  return prisma.organizationSettings.upsert({
    where: { id: 1 },
    create: { id: 1, plan: input.plan },
    update: { plan: input.plan },
  });
}
