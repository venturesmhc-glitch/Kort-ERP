import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import { StockService } from '../articles/stock.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateSaleInput, ListSalesQuery } from './sales.schema.js';

const SALE_INCLUDE = {
  client: true,
  seller: { select: { id: true, firstName: true, lastName: true } },
  items: { include: { article: { select: { id: true, name: true } } } },
} satisfies Prisma.SaleInclude;

// Venta channel POS del panel: siempre ligada a quien la carga (sellerId =
// usuario autenticado). El channel MERCH (checkout publico, etapa 11) no
// existe todavia - cuando se implemente, sellerId quedara null.
export async function createSale(input: CreateSaleInput, user: AuthUser) {
  let clientId = input.clientId;
  if (input.client) {
    const client = await findOrCreateClientByPhone(input.client);
    clientId = client.id;
  }

  const articleIds = [...new Set(input.items.map((item) => item.articleId))];
  const articles = await prisma.article.findMany({ where: { id: { in: articleIds } } });
  const articleMap = new Map(articles.map((article) => [article.id, article]));

  for (const item of input.items) {
    const article = articleMap.get(item.articleId);
    if (!article || !article.active) {
      throw new NotFoundError(`Articulo no encontrado o inactivo: ${item.articleId}`);
    }
  }

  const itemsWithPrice = input.items.map((item) => {
    const article = articleMap.get(item.articleId)!;
    const unitPrice = item.unitPrice ?? article.price;
    return { ...item, unitPrice, subtotal: unitPrice * item.quantity };
  });
  const totalAmount = itemsWithPrice.reduce((sum, item) => sum + item.subtotal, 0);

  // Todo dentro de una sola transaccion: si a StockService.decreaseStock le
  // falta stock para cualquier item, tira y se revierte la venta completa
  // (Sale + SaleItem incluidos) - ver stock.service.ts para el soporte de tx.
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        channel: 'POS',
        clientId,
        sellerId: user.id,
        totalAmount,
        items: {
          create: itemsWithPrice.map((item) => ({
            articleId: item.articleId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
      include: SALE_INCLUDE,
    });

    for (const item of itemsWithPrice) {
      await StockService.decreaseStock(item.articleId, item.quantity, `Venta ${created.id}`, tx);
    }

    return created;
  });

  const treasuryWarning = await TreasuryService.recordIncomeFromSale(sale);

  return treasuryWarning ? { ...sale, treasuryWarning } : sale;
}

export function listSales(filters: ListSalesQuery) {
  return prisma.sale.findMany({
    where: {
      sellerId: filters.sellerId,
      items: filters.articleId ? { some: { articleId: filters.articleId } } : undefined,
      createdAt: {
        gte: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : undefined,
        lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
      },
    },
    include: SALE_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}
