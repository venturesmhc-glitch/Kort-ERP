import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../utils/errors.js';
import type { UpdateGrowthSettingsInput } from './growth-settings.schema.js';

type Db = Prisma.TransactionClient | typeof prisma;

// Fila unica (id fijo en 1), mismo patron que AppointmentSettings/
// OrganizationSettings: el upsert evita depender de un seed, la primera
// lectura ya crea la fila con los defaults del schema. db es opcional para
// poder leerla desde dentro de la transaccion de Cortes/Ventas/Merch sin
// abrir una conexion aparte (ver loyalty.service.ts).
export function getGrowthSettings(db: Db = prisma) {
  return db.growthSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
}

// reactivationDiscountId no es FK en el schema (mismo criterio que
// Discount.applicableItems/applicableCategories): se valida contra el
// catalogo real aca antes de guardar.
export async function updateGrowthSettings(input: UpdateGrowthSettingsInput) {
  const reactivationDiscountId = input.reactivationDiscountId || null;
  if (reactivationDiscountId) {
    const discount = await prisma.discount.findFirst({
      where: { id: reactivationDiscountId, deletedAt: null },
    });
    if (!discount) {
      throw new AppError('El cupon de reactivacion seleccionado no existe');
    }
  }

  const data = {
    loyaltyEnabled: input.loyaltyEnabled,
    loyaltyEarnRatio: input.loyaltyEarnRatio,
    loyaltyRedeemRatio: input.loyaltyRedeemRatio,
    reactivationEnabled: input.reactivationEnabled,
    reactivationInactiveDays: input.reactivationInactiveDays,
    reactivationCooldownDays: input.reactivationCooldownDays,
    reactivationDiscountId,
    reviewRequestEnabled: input.reviewRequestEnabled,
    reviewRequestDelayHours: input.reviewRequestDelayHours,
    googleReviewUrl: input.googleReviewUrl || null,
  };

  return prisma.growthSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}
