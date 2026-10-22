import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { getGrowthSettings } from '../growth-settings/growth-settings.service.js';
import { createDiscount, deleteDiscount } from '../discounts/discounts.service.js';

type TxClient = Prisma.TransactionClient;

interface ActivitySource {
  cutId?: string;
  saleId?: string;
}

// Gancho que Cortes/Ventas/Merch invocan dentro de su propia transaccion
// (ver cuts.service.ts, sales.service.ts, merch.service.ts), mismo criterio
// que TreasuryService.recordIncomeFrom*: si algo de esto fallara, la
// transaccion completa se revierte junto con el corte/venta, nunca queda un
// corte guardado sin su actividad de cliente registrada.
// lastVisitAt se actualiza siempre (alimenta la reactivacion de clientes
// inactivos, ver retention.service.ts), independiente de si Fidelizacion
// esta habilitada. Los puntos solo se otorgan si loyaltyEnabled.
export async function recordClientActivity(
  tx: TxClient,
  clientId: string,
  amount: number,
  source: ActivitySource,
  description: string
): Promise<void> {
  const settings = await getGrowthSettings(tx);

  await tx.client.update({ where: { id: clientId }, data: { lastVisitAt: new Date() } });

  if (!settings.loyaltyEnabled || settings.loyaltyEarnRatio <= 0 || amount <= 0) {
    return;
  }

  const points = Math.floor(amount / settings.loyaltyEarnRatio);
  if (points <= 0) {
    return;
  }

  await tx.client.update({ where: { id: clientId }, data: { loyaltyPoints: { increment: points } } });
  await tx.loyaltyTransaction.create({
    data: { clientId, type: 'EARN', points, description, ...source },
  });
}

export function listLoyaltyTransactions(clientId: string) {
  return prisma.loyaltyTransaction.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
  });
}

// Canje de puntos por un cupon de descuento: reutiliza 100% el motor de
// Descuentos existente (no hace falta tocar createSale/createCut) - el
// cupon generado se entrega al cliente y se aplica como cualquier otro en
// su proxima compra/corte. El cupon se crea primero (si algo falla despues,
// queda un cupon sin usar y sin dueno, inocuo); si el descuento de puntos
// fallara, se da de baja el cupon recien creado para no regalar un cupon sin
// haber cobrado los puntos.
export async function redeemPoints(clientId: string, points: number) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    throw new NotFoundError('Cliente no encontrado');
  }

  const settings = await getGrowthSettings();
  if (!settings.loyaltyEnabled) {
    throw new AppError('El programa de fidelidad no esta habilitado');
  }
  if (client.loyaltyPoints < points) {
    throw new AppError(`El cliente solo tiene ${client.loyaltyPoints} puntos disponibles`);
  }

  const amount = points * settings.loyaltyRedeemRatio;
  const discount = await createDiscount({
    name: `Canje de puntos - ${client.firstName} ${client.lastName}`,
    type: 'FIXED_AMOUNT',
    scope: 'BOTH',
    value: amount,
    maxUses: 1,
    isActive: true,
  });

  try {
    await prisma.$transaction([
      prisma.client.update({ where: { id: clientId }, data: { loyaltyPoints: { decrement: points } } }),
      prisma.loyaltyTransaction.create({
        data: {
          clientId,
          type: 'REDEEM',
          points,
          description: `Canje por cupon ${discount.code}`,
          discountId: discount.id,
        },
      }),
    ]);
  } catch (error) {
    await deleteDiscount(discount.id).catch(() => undefined);
    throw error;
  }

  return discount;
}
