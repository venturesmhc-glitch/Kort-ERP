import { Prisma } from '@prisma/client';
import type { Discount } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import { StockService } from '../articles/stock.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { calculateDiscountAmount, incrementUsesCount, resolveEligibleDiscount } from '../discounts/discounts.service.js';
import { paginationSkipTake, toPaginated } from '../../utils/pagination.js';
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
  const cartTotal = itemsWithPrice.reduce((sum, item) => sum + item.subtotal, 0);

  // A diferencia del wizard/checkout publico (best-effort, un cupon invalido
  // simplemente no se aplica), aca es personal autenticado cargando una
  // venta: un codigo invalido tiene que ser un error visible que bloquea la
  // venta, no un descuento que se pierde en silencio.
  let discount: Discount | null = null;
  let discountAmount = 0;
  if (input.discountCode) {
    const eligible = await resolveEligibleDiscount(input.discountCode);
    if (!eligible.ok) {
      throw new AppError(eligible.reason);
    }
    if (eligible.discount.scope !== 'MERCH' && eligible.discount.scope !== 'BOTH') {
      throw new AppError('Este cupon no aplica a productos');
    }
    if (eligible.discount.minOrderAmount !== null && cartTotal < eligible.discount.minOrderAmount) {
      throw new AppError('No se alcanzo el monto minimo de compra para este cupon');
    }
    discount = eligible.discount;
    const pricedItems = itemsWithPrice.map((item) => ({
      articleId: item.articleId,
      tipoProductoId: articleMap.get(item.articleId)!.tipoProductoId,
      quantity: item.quantity,
      subtotal: item.subtotal,
    }));
    discountAmount = calculateDiscountAmount(discount, pricedItems, cartTotal);
  }
  const totalAmount = cartTotal - discountAmount;

  // Todo dentro de una sola transaccion: si a StockService.decreaseStock le
  // falta stock para cualquier item, tira y se revierte la venta completa
  // (Sale + SaleItem incluidos) - ver stock.service.ts para el soporte de tx.
  // El canal POS no tiene ciclo de vida (es COMPLETED de una), asi que el
  // cupon se redime (incrementUsesCount) ya mismo, en la misma transaccion.
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        channel: 'POS',
        clientId,
        sellerId: user.id,
        totalAmount,
        discountId: discount?.id,
        discountAmount: discount ? discountAmount : undefined,
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

    if (discount) {
      await incrementUsesCount(tx, discount.id, discount.maxUses);
    }

    await TreasuryService.recordIncomeFromSale(tx, created);

    return created;
  });

  return sale;
}

export async function listSales(filters: ListSalesQuery) {
  const where: Prisma.SaleWhereInput = {
    sellerId: filters.sellerId,
    items: filters.articleId ? { some: { articleId: filters.articleId } } : undefined,
    createdAt: {
      gte: filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : undefined,
      lte: filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : undefined,
    },
  };

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: SALE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      ...paginationSkipTake(filters),
    }),
    prisma.sale.count({ where }),
  ]);

  return toPaginated(items, total, filters);
}
