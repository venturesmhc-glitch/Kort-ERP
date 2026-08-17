import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { AuthUser } from '../../middleware/auth.js';
import type {
  CreateTreasuryEntryInput,
  ListTreasuryEntriesQuery,
  TreasurySummaryQuery,
} from './treasury.schema.js';

const ENTRY_INCLUDE = {
  category: { select: { id: true, name: true } },
  cut: { select: { id: true } },
  sale: { select: { id: true } },
} satisfies Prisma.TreasuryEntryInclude;

function parseLocalDate(iso: string, endOfDay = false) {
  return new Date(`${iso}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
}

async function assertCategoryMatchesType(categoryId: string, type: 'INCOME' | 'EXPENSE') {
  const category = await prisma.parameterItem.findUnique({
    where: { id: categoryId },
    include: { category: true },
  });
  if (!category || category.deletedAt || !category.active) {
    throw new NotFoundError('Categoria no encontrada');
  }

  const expectedKey = type === 'INCOME' ? 'categorias-ingresos' : 'categorias-costos';
  if (category.category.key !== expectedKey) {
    throw new ConflictError(
      type === 'INCOME'
        ? 'La categoria debe pertenecer a Categorias de ingresos'
        : 'La categoria debe pertenecer a Categorias de costos'
    );
  }
}

export async function createEntry(input: CreateTreasuryEntryInput, user: AuthUser) {
  await assertCategoryMatchesType(input.categoryId, input.type);

  return prisma.treasuryEntry.create({
    data: {
      type: input.type,
      expenseKind: input.type === 'EXPENSE' ? input.expenseKind : null,
      categoryId: input.categoryId,
      amount: input.amount,
      description: input.description,
      entryDate: parseLocalDate(input.entryDate),
      source: 'MANUAL',
      createdByUserId: user.id,
    },
    include: ENTRY_INCLUDE,
  });
}

export function listEntries(filters: ListTreasuryEntriesQuery) {
  return prisma.treasuryEntry.findMany({
    where: {
      type: filters.type,
      categoryId: filters.categoryId,
      source: filters.source,
      entryDate: {
        gte: filters.dateFrom ? parseLocalDate(filters.dateFrom) : undefined,
        lte: filters.dateTo ? parseLocalDate(filters.dateTo, true) : undefined,
      },
    },
    include: ENTRY_INCLUDE,
    orderBy: { entryDate: 'desc' },
  });
}

export async function deleteEntry(id: string) {
  const entry = await prisma.treasuryEntry.findUnique({ where: { id } });
  if (!entry) {
    throw new NotFoundError('Movimiento no encontrado');
  }
  if (entry.source !== 'MANUAL') {
    throw new ConflictError('No se puede eliminar un movimiento generado automaticamente');
  }
  await prisma.treasuryEntry.delete({ where: { id } });
}

function defaultRange(query: TreasurySummaryQuery) {
  const now = new Date();
  const from = query.dateFrom
    ? parseLocalDate(query.dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : now;
  return { from, to };
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

/**
 * Punto de equilibrio aproximado: no separamos precio/costo a nivel
 * articulo/corte, asi que el margen de contribucion se estima con el ratio de
 * costos variables sobre ingresos del propio periodo (asume que el costo
 * variable escala con el ingreso, no es un margen real por producto). Si el
 * margen da <= 0 no hay ingreso objetivo finito - se devuelve null y la UI se
 * apoya solo en la serie de cruce acumulado.
 */
export async function getSummary(query: TreasurySummaryQuery) {
  const { from, to } = defaultRange(query);

  const entries = await prisma.treasuryEntry.findMany({
    where: { entryDate: { gte: from, lte: to } },
    include: { category: { select: { id: true, name: true } } },
    orderBy: { entryDate: 'asc' },
  });

  let income = 0;
  let fixedCosts = 0;
  let variableCosts = 0;
  const byCategory = new Map<string, { categoryId: string; categoryName: string; type: string; total: number }>();
  const dailyIncome = new Map<string, number>();
  const dailyCosts = new Map<string, number>();

  for (const entry of entries) {
    const key = `${entry.type}-${entry.categoryId}`;
    const bucket = byCategory.get(key) ?? {
      categoryId: entry.categoryId,
      categoryName: entry.category.name,
      type: entry.type,
      total: 0,
    };
    bucket.total += entry.amount;
    byCategory.set(key, bucket);

    const day = dayKey(entry.entryDate);
    if (entry.type === 'INCOME') {
      income += entry.amount;
      dailyIncome.set(day, (dailyIncome.get(day) ?? 0) + entry.amount);
    } else {
      if (entry.expenseKind === 'FIXED') {
        fixedCosts += entry.amount;
      } else {
        variableCosts += entry.amount;
      }
      dailyCosts.set(day, (dailyCosts.get(day) ?? 0) + entry.amount);
    }
  }

  const totalCosts = fixedCosts + variableCosts;
  const contributionMarginRatio = income > 0 ? 1 - variableCosts / income : null;
  const breakevenRevenue =
    contributionMarginRatio !== null && contributionMarginRatio > 0
      ? fixedCosts / contributionMarginRatio
      : null;

  const days = [...new Set([...dailyIncome.keys(), ...dailyCosts.keys()])].sort();
  let cumulativeIncome = 0;
  let cumulativeCosts = 0;
  let reachedAt: string | null = null;
  const series = days.map((day) => {
    cumulativeIncome += dailyIncome.get(day) ?? 0;
    cumulativeCosts += dailyCosts.get(day) ?? 0;
    if (reachedAt === null && cumulativeIncome >= cumulativeCosts && cumulativeCosts > 0) {
      reachedAt = day;
    }
    return { date: day, cumulativeIncome, cumulativeCosts };
  });

  return {
    from: dayKey(from),
    to: dayKey(to),
    totals: {
      income,
      fixedCosts,
      variableCosts,
      totalCosts,
      result: income - totalCosts,
    },
    breakeven: {
      contributionMarginRatio,
      breakevenRevenue,
      reachedAt,
    },
    categoryBreakdown: [...byCategory.values()],
    series,
  };
}

async function recordIncome(
  type: { name: string; description: string },
  amount: number,
  source: 'CUT' | 'SALE',
  linkId: { cutId?: string; saleId?: string }
): Promise<string | undefined> {
  try {
    const category = await prisma.parameterItem.findFirst({
      where: { category: { key: 'categorias-ingresos' }, name: type.name, deletedAt: null },
    });
    if (!category) {
      const warning = `No se encontro la categoria de ingresos "${type.name}" en Parametrizados: el ${
        source === 'CUT' ? 'corte' : 'la venta'
      } se guardo pero no genero movimiento en Tesoreria.`;
      console.error(`[TreasuryService] ${warning}`);
      return warning;
    }

    await prisma.treasuryEntry.create({
      data: {
        type: 'INCOME',
        categoryId: category.id,
        amount,
        description: type.description,
        entryDate: new Date(),
        source,
        ...linkId,
      },
    });
    return undefined;
  } catch (error) {
    console.error(`[TreasuryService] Error registrando ingreso automatico (${source})`, error);
    return 'Ocurrio un error registrando el ingreso en Tesoreria. Revisalo manualmente.';
  }
}

// Implementacion real de los hooks que Cortes y Ventas ya invocan (ver
// cuts.service.ts y sales.service.ts). Se ejecutan despues de que la
// transaccion principal (corte/venta) ya commiteo, y absorben sus propios
// errores para no tumbar esa respuesta por un problema de Tesoreria (ej.
// categoria de ingresos borrada) - el corte/venta ya quedo guardado.
export const TreasuryService = {
  /** Devuelve un mensaje de warning si no se pudo registrar el ingreso, o undefined si salio bien. */
  recordIncomeFromCut(cut: { id: string; price: number }) {
    return recordIncome(
      { name: 'Cortes', description: `Ingreso por corte ${cut.id}` },
      cut.price,
      'CUT',
      { cutId: cut.id }
    );
  },
  recordIncomeFromSale(sale: { id: string; totalAmount: number }) {
    return recordIncome(
      { name: 'Ventas merchandising', description: `Ingreso por venta ${sale.id}` },
      sale.totalAmount,
      'SALE',
      { saleId: sale.id }
    );
  },
};
