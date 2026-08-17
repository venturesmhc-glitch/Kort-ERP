import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';

type Db = Prisma.TransactionClient | typeof prisma;

// db es opcional para poder componer esto dentro de la transaccion de otro
// modulo (ver Ventas: crea el Sale y descuenta stock atomicamente, todo junto
// o nada) sin duplicar la logica de movimiento. Sin db explicito, abre su
// propia transaccion (uso actual de Articulos/Stock).
async function applyMovement(
  articleId: string,
  type: 'IN' | 'OUT',
  quantity: number,
  reason?: string,
  db: Db = prisma
) {
  if (quantity <= 0) {
    throw new ConflictError('La cantidad debe ser mayor a 0');
  }

  const run = async (tx: Db) => {
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
  };

  if (db !== prisma) {
    return run(db);
  }
  return prisma.$transaction((tx) => run(tx));
}

// Gancho para Ventas y para el checkout de Merch en la landing: ambos
// descuentan stock inmediatamente dentro de una transaccion junto con su
// StockMovement. No existe todavia una reserva real (stock separado que no
// descuenta hasta el retiro) - si el pedido de merch se cancela, el stock se
// repone con increaseStock (ver merch.service.ts).
export const StockService = {
  decreaseStock(articleId: string, quantity: number, reason?: string, tx?: Prisma.TransactionClient) {
    return applyMovement(articleId, 'OUT', quantity, reason, tx ?? prisma);
  },
  increaseStock(articleId: string, quantity: number, reason?: string, tx?: Prisma.TransactionClient) {
    return applyMovement(articleId, 'IN', quantity, reason, tx ?? prisma);
  },
};
