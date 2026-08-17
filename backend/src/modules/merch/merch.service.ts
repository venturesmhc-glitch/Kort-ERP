import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import { StockService } from '../articles/stock.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import type { CheckoutInput, UpdateMerchStatusInput } from './merch.schema.js';

const MERCH_SALE_INCLUDE = {
  client: true,
  items: { include: { article: { select: { id: true, name: true } } } },
} satisfies Prisma.SaleInclude;

// Checkout publico de merch (etapa 11): el stock se descuenta ya mismo (igual
// que Ventas, ver StockService.reserveStock) y el pedido queda
// PENDING_PICKUP hasta que se retira y paga en el local (sin pasarela). El
// ingreso en Tesoreria recien se registra al marcarlo DELIVERED (ver
// updateMerchOrderStatus) para no contabilizar pedidos que terminan
// cancelados.
export async function createMerchOrder(input: CheckoutInput) {
  const client = await findOrCreateClientByPhone(input.client);

  const articleIds = [...new Set(input.items.map((item) => item.articleId))];
  const articles = await prisma.article.findMany({ where: { id: { in: articleIds } } });
  const articleMap = new Map(articles.map((article) => [article.id, article]));

  for (const item of input.items) {
    const article = articleMap.get(item.articleId);
    if (!article || !article.active) {
      throw new NotFoundError(`Articulo no encontrado o inactivo: ${item.articleId}`);
    }
  }

  // El precio siempre sale del catalogo (a diferencia de Ventas POS, que deja
  // al vendedor override-earlo): es un checkout publico, no confiamos precio
  // enviado por el cliente.
  const itemsWithPrice = input.items.map((item) => {
    const article = articleMap.get(item.articleId)!;
    return { ...item, unitPrice: article.price, subtotal: article.price * item.quantity };
  });
  const totalAmount = itemsWithPrice.reduce((sum, item) => sum + item.subtotal, 0);

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        channel: 'MERCH',
        status: 'PENDING_PICKUP',
        clientId: client.id,
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
      include: MERCH_SALE_INCLUDE,
    });

    for (const item of itemsWithPrice) {
      await StockService.reserveStock(item.articleId, item.quantity, `Pedido merch ${sale.id}`, tx);
    }

    return sale;
  });
}

export function listPendingMerchOrders() {
  return prisma.sale.findMany({
    where: { channel: 'MERCH', status: 'PENDING_PICKUP' },
    include: MERCH_SALE_INCLUDE,
    orderBy: { createdAt: 'asc' },
  });
}

async function getMerchOrder(id: string) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: MERCH_SALE_INCLUDE });
  if (!sale || sale.channel !== 'MERCH') {
    throw new NotFoundError('Pedido no encontrado');
  }
  return sale;
}

export async function updateMerchOrderStatus(id: string, input: UpdateMerchStatusInput) {
  const sale = await getMerchOrder(id);
  if (sale.status !== 'PENDING_PICKUP') {
    throw new ConflictError('Este pedido ya fue procesado');
  }

  if (input.status === 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
      for (const item of sale.items) {
        await StockService.increaseStock(
          item.articleId,
          item.quantity,
          `Cancelacion pedido merch ${sale.id}`,
          tx
        );
      }
      await tx.sale.update({ where: { id: sale.id }, data: { status: 'CANCELLED' } });
    });
    return getMerchOrder(id);
  }

  const updated = await prisma.sale.update({
    where: { id: sale.id },
    data: { status: 'DELIVERED' },
    include: MERCH_SALE_INCLUDE,
  });
  await TreasuryService.recordIncomeFromSale(updated);
  return updated;
}
