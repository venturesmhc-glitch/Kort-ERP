import { prisma } from '../../lib/prisma.js';
import type { CommissionsQuery } from './commissions.schema.js';

function parseLocalDate(iso: string, endOfDay = false) {
  return new Date(`${iso}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
}

function defaultRange(query: CommissionsQuery) {
  const now = new Date();
  const from = query.dateFrom ? parseLocalDate(query.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : now;
  return { from, to };
}

export interface CommissionRow {
  barberoId: string;
  barberoNombre: string;
  commissionRate: number;
  cortesCantidad: number;
  cortesMonto: number;
  cortesComision: number;
  ventasCantidad: number;
  ventasMonto: number;
  ventasComision: number;
  totalComision: number;
}

// Comision = commissionRate% sobre el monto de cada Corte (barberoId) y cada
// Venta POS/Merch entregada (sellerId) que el barbero registra el mismo,
// ver skills.md/instrucciones del modulo. Sin commissionRate configurado
// (sueldo fijo) el barbero igual aparece en el reporte, con comision en 0 -
// asi se ve a quien todavia falta configurarle el porcentaje.
export async function getCommissionsReport(query: CommissionsQuery): Promise<CommissionRow[]> {
  const { from, to } = defaultRange(query);

  const barberos = await prisma.user.findMany({
    where: {
      esBarbero: true,
      active: true,
      ...(query.barberoId ? { id: query.barberoId } : {}),
    },
    select: { id: true, firstName: true, lastName: true, commissionRate: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });

  const barberoIds = barberos.map((b) => b.id);
  if (barberoIds.length === 0) {
    return [];
  }

  const [cutsAgg, salesAgg] = await Promise.all([
    prisma.cut.groupBy({
      by: ['barberoId'],
      where: { barberoId: { in: barberoIds }, cutAt: { gte: from, lte: to } },
      _sum: { price: true },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ['sellerId'],
      where: {
        sellerId: { in: barberoIds },
        createdAt: { gte: from, lte: to },
        status: { in: ['COMPLETED', 'DELIVERED'] },
      },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const cutsByBarbero = new Map(cutsAgg.map((row) => [row.barberoId, row]));
  const salesByBarbero = new Map(salesAgg.map((row) => [row.sellerId as string, row]));

  return barberos.map((barbero) => {
    const cuts = cutsByBarbero.get(barbero.id);
    const sales = salesByBarbero.get(barbero.id);
    const cortesMonto = cuts?._sum.price ?? 0;
    const ventasMonto = sales?._sum.totalAmount ?? 0;
    const rate = barbero.commissionRate ?? 0;
    const cortesComision = Math.round((cortesMonto * rate) / 100);
    const ventasComision = Math.round((ventasMonto * rate) / 100);

    return {
      barberoId: barbero.id,
      barberoNombre: `${barbero.firstName} ${barbero.lastName}`,
      commissionRate: rate,
      cortesCantidad: cuts?._count._all ?? 0,
      cortesMonto,
      cortesComision,
      ventasCantidad: sales?._count._all ?? 0,
      ventasMonto,
      ventasComision,
      totalComision: cortesComision + ventasComision,
    };
  });
}
