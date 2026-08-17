import { prisma } from '../../lib/prisma.js';
import { getWorkedHoursReport } from '../workshifts/workshifts.service.js';
import type { StatsQuery } from './stats.schema.js';

function parseLocalDate(iso: string, endOfDay = false) {
  return new Date(`${iso}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function defaultRange(query: StatsQuery) {
  const now = new Date();
  const from = query.dateFrom
    ? parseLocalDate(query.dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : now;
  return { from, to };
}

// Clientes: altas por dia en el periodo + nuevos vs. recurrentes entre los
// clientes con actividad (Cortes) en el periodo, ver skills.md #5.10.
export async function getClientStats(query: StatsQuery) {
  const { from, to } = defaultRange(query);

  const altas = await prisma.client.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { createdAt: true },
  });
  const altasPorDia = new Map<string, number>();
  for (const client of altas) {
    const day = dayKey(client.createdAt);
    altasPorDia.set(day, (altasPorDia.get(day) ?? 0) + 1);
  }

  const activeClientIds = await prisma.cut.findMany({
    where: { cutAt: { gte: from, lte: to } },
    select: { clientId: true },
    distinct: ['clientId'],
  });
  const activeClients = activeClientIds.length
    ? await prisma.client.findMany({
        where: { id: { in: activeClientIds.map((c) => c.clientId) } },
        select: { createdAt: true },
      })
    : [];
  let nuevos = 0;
  let recurrentes = 0;
  for (const client of activeClients) {
    if (client.createdAt >= from) nuevos += 1;
    else recurrentes += 1;
  }

  return {
    from: dayKey(from),
    to: dayKey(to),
    totalAltas: altas.length,
    altasPorDia: [...altasPorDia.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date)),
    nuevosVsRecurrentes: { nuevos, recurrentes },
  };
}

// Barberos: cortes realizados, ventas generadas (channel POS via sellerId) y
// horas trabajadas. Las horas se calculan reutilizando
// WorkShiftsService.getWorkedHoursReport (Jornadas laborales) en vez de
// recalcularlas aca.
export async function getBarberStats(query: StatsQuery) {
  const { from, to } = defaultRange(query);

  const [cortesGroup, ventasGroup, workedHours] = await Promise.all([
    prisma.cut.groupBy({
      by: ['barberoId'],
      where: { cutAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.sale.groupBy({
      by: ['sellerId'],
      where: { createdAt: { gte: from, lte: to }, sellerId: { not: null } },
      _sum: { totalAmount: true },
    }),
    getWorkedHoursReport(query),
  ]);

  const barberoIds = new Set<string>([
    ...cortesGroup.map((c) => c.barberoId),
    ...ventasGroup.map((v) => v.sellerId!),
    ...workedHours.map((w) => w.barberoId),
  ]);
  const barberos = barberoIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...barberoIds] } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const nombreById = new Map(barberos.map((b) => [b.id, `${b.firstName} ${b.lastName}`]));

  const cortesById = new Map(cortesGroup.map((c) => [c.barberoId, c._count._all]));
  const ventasById = new Map(ventasGroup.map((v) => [v.sellerId!, v._sum.totalAmount ?? 0]));
  const horasById = new Map<string, number>();
  for (const row of workedHours) {
    horasById.set(row.barberoId, (horasById.get(row.barberoId) ?? 0) + row.horasTrabajadas);
  }

  return [...barberoIds]
    .map((barberoId) => ({
      barberoId,
      barberoNombre: nombreById.get(barberoId) ?? 'Desconocido',
      cortesRealizados: cortesById.get(barberoId) ?? 0,
      ventasGeneradas: ventasById.get(barberoId) ?? 0,
      horasTrabajadas: horasById.get(barberoId) ?? 0,
    }))
    .sort((a, b) => b.cortesRealizados - a.cortesRealizados);
}

// Cortes: cantidad por tipo + evolucion diaria en el periodo.
export async function getCutStats(query: StatsQuery) {
  const { from, to } = defaultRange(query);

  const [porTipoGroup, cuts] = await Promise.all([
    prisma.cut.groupBy({
      by: ['tipoCorteId'],
      where: { cutAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    prisma.cut.findMany({ where: { cutAt: { gte: from, lte: to } }, select: { cutAt: true } }),
  ]);

  const tipos = porTipoGroup.length
    ? await prisma.parameterItem.findMany({
        where: { id: { in: porTipoGroup.map((t) => t.tipoCorteId) } },
        select: { id: true, name: true },
      })
    : [];
  const nombreByTipoId = new Map(tipos.map((t) => [t.id, t.name]));

  const evolucionPorDia = new Map<string, number>();
  for (const cut of cuts) {
    const day = dayKey(cut.cutAt);
    evolucionPorDia.set(day, (evolucionPorDia.get(day) ?? 0) + 1);
  }

  return {
    from: dayKey(from),
    to: dayKey(to),
    totalCortes: cuts.length,
    porTipo: porTipoGroup.map((t) => ({
      tipoCorteId: t.tipoCorteId,
      tipoCorteNombre: nombreByTipoId.get(t.tipoCorteId) ?? 'Desconocido',
      cantidad: t._count._all,
    })),
    evolucion: [...evolucionPorDia.entries()]
      .map(([date, cantidad]) => ({ date, cantidad }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// Ventas: totales por dia, por articulo y por categoria de producto
// (Parametrizados). La agrupacion por categoria no la soporta groupBy de
// Prisma (es un campo de una relacion de dos saltos: SaleItem -> Article ->
// ParameterItem), asi que se resuelve en JS igual que en Tesoreria.
export async function getSaleStats(query: StatsQuery) {
  const { from, to } = defaultRange(query);

  const [sales, porArticuloGroup, itemsConCategoria] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.saleItem.groupBy({
      by: ['articleId'],
      where: { sale: { createdAt: { gte: from, lte: to } } },
      _sum: { subtotal: true, quantity: true },
    }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      select: { subtotal: true, article: { select: { tipoProducto: { select: { id: true, name: true } } } } },
    }),
  ]);

  const totalPorDia = new Map<string, number>();
  let totalVentas = 0;
  for (const sale of sales) {
    totalPorDia.set(dayKey(sale.createdAt), (totalPorDia.get(dayKey(sale.createdAt)) ?? 0) + sale.totalAmount);
    totalVentas += sale.totalAmount;
  }

  const articleIds = porArticuloGroup.map((a) => a.articleId);
  const articles = articleIds.length
    ? await prisma.article.findMany({ where: { id: { in: articleIds } }, select: { id: true, name: true } })
    : [];
  const nombreByArticleId = new Map(articles.map((a) => [a.id, a.name]));

  const porCategoria = new Map<string, { categoriaId: string; categoriaNombre: string; total: number }>();
  for (const item of itemsConCategoria) {
    const categoria = item.article.tipoProducto;
    const bucket = porCategoria.get(categoria.id) ?? {
      categoriaId: categoria.id,
      categoriaNombre: categoria.name,
      total: 0,
    };
    bucket.total += item.subtotal;
    porCategoria.set(categoria.id, bucket);
  }

  return {
    from: dayKey(from),
    to: dayKey(to),
    totalVentas,
    serieDiaria: [...totalPorDia.entries()]
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    porArticulo: porArticuloGroup.map((a) => ({
      articleId: a.articleId,
      articleNombre: nombreByArticleId.get(a.articleId) ?? 'Desconocido',
      cantidad: a._sum.quantity ?? 0,
      total: a._sum.subtotal ?? 0,
    })),
    porCategoria: [...porCategoria.values()],
  };
}
