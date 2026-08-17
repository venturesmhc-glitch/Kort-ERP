import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';

async function applyMovement(
  articleId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  reason?: string
) {
  if (quantity <= 0) {
    throw new ConflictError('La cantidad debe ser mayor a 0');
  }

  return prisma.$transaction(async (tx) => {
    const article = await tx.article.findUnique({ where: { id: articleId } });
    if (!article) {
      throw new NotFoundError('Articulo no encontrado');
    }

    const nextStock = type === 'IN' ? article.stock + quantity : article.stock - quantity;
    if (nextStock < 0) {
      throw new ConflictError('Stock insuficiente para este egreso');
    }

    const updated = await tx.article.update({
      where: { id: articleId },
      data: { stock: nextStock },
    });
    await tx.stockMovement.create({ data: { articleId, type, quantity, reason } });

    return updated;
  });
}

// Gancho para Ventas y la reserva de Merch en la landing (ninguno de los dos
// existe todavia). Las tres operaciones actualizan el stock inmediatamente
// dentro de una transaccion junto con su StockMovement; reserveStock no
// implementa una reserva-sin-descuento real todavia porque no hay ningun
// consumidor que la necesite - cuando exista, extender con un contador
// reservedStock separado en vez de descontar directo.
export const StockService = {
  decreaseStock(articleId: string, quantity: number, reason?: string) {
    return applyMovement(articleId, 'OUT', quantity, reason);
  },
  increaseStock(articleId: string, quantity: number, reason?: string) {
    return applyMovement(articleId, 'IN', quantity, reason);
  },
  reserveStock(articleId: string, quantity: number, reason?: string) {
    return applyMovement(articleId, 'OUT', quantity, reason ?? 'Reserva');
  },
};
