import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { StockService } from '../articles/stock.service.js';
import type { ListPurchaseOrdersQuery, UpdatePurchaseOrderInput } from './purchase-orders.schema.js';

type Db = Prisma.TransactionClient | typeof prisma;

const ORDER_INCLUDE = {
  proveedor: true,
  items: { include: { article: { select: { id: true, name: true, stock: true } } } },
} satisfies Prisma.OrdenCompraInclude;

export function listOrders(filters: ListPurchaseOrdersQuery) {
  return prisma.ordenCompra.findMany({
    where: { estado: filters.estado, proveedorId: filters.proveedorId },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getOrder(id: string) {
  const order = await prisma.ordenCompra.findUnique({ where: { id }, include: ORDER_INCLUDE });
  if (!order) {
    throw new NotFoundError('Orden de compra no encontrada');
  }
  return order;
}

function assertEditable(order: { estado: string }) {
  if (order.estado !== 'BORRADOR') {
    throw new ConflictError('Solo se puede editar una orden en borrador');
  }
}

// Reemplaza todos los items (agregar/quitar/cambiar cantidad o proveedor
// sugerido se resuelve mandando la lista completa, mas simple que parchear
// item por item).
export async function updateOrder(id: string, input: UpdatePurchaseOrderInput) {
  const order = await getOrder(id);
  assertEditable(order);

  const total = input.items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);

  return prisma.$transaction(async (tx) => {
    await tx.ordenCompraItem.deleteMany({ where: { ordenId: id } });
    return tx.ordenCompra.update({
      where: { id },
      data: {
        proveedorId: input.proveedorId ?? order.proveedorId,
        total,
        items: { create: input.items },
      },
      include: ORDER_INCLUDE,
    });
  });
}

export async function confirmOrder(id: string) {
  const order = await getOrder(id);
  if (order.estado !== 'BORRADOR') {
    throw new ConflictError('La orden ya fue confirmada');
  }
  return prisma.ordenCompra.update({
    where: { id },
    data: { estado: 'CONFIRMADA', fechaConfirmacion: new Date() },
    include: ORDER_INCLUDE,
  });
}

export async function sendOrder(id: string) {
  const order = await getOrder(id);
  if (order.estado !== 'CONFIRMADA') {
    throw new ConflictError('La orden debe estar confirmada para marcarla como enviada');
  }
  return prisma.ordenCompra.update({
    where: { id },
    data: { estado: 'ENVIADA', fechaEnvio: new Date() },
    include: ORDER_INCLUDE,
  });
}

// Recibir da de alta el stock de cada item, dentro de la misma transaccion
// que el cambio de estado (mismo mecanismo transaccional que Ventas usa
// para descontar, ver sales.service.ts).
export async function receiveOrder(id: string) {
  const order = await getOrder(id);
  if (order.estado !== 'ENVIADA') {
    throw new ConflictError('La orden debe estar enviada para recibirla');
  }

  return prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await StockService.increaseStock(
        item.articleId,
        item.cantidad,
        `Recepcion orden de compra ${id}`,
        tx
      );
    }
    return tx.ordenCompra.update({
      where: { id },
      data: { estado: 'RECIBIDA', fechaRecepcion: new Date() },
      include: ORDER_INCLUDE,
    });
  });
}

export async function deleteOrder(id: string) {
  const order = await getOrder(id);
  assertEditable(order);
  await prisma.ordenCompra.delete({ where: { id } });
}

// Gancho automatico (Plan Integral): llamado desde StockService.applyMovement
// dentro de la misma transaccion que el movimiento que dejo el articulo bajo
// stockMinimo, asi la deteccion y el borrador son atomicos con la
// venta/ajuste que los disparo (ver stock.service.ts).
export async function syncDraftForArticle(articleId: string, tx: Db) {
  const article = await tx.article.findUnique({ where: { id: articleId } });
  if (!article || article.stockMinimo === null || article.stock > article.stockMinimo) {
    return;
  }

  const supplierLink = await tx.proveedorProducto.findFirst({
    where: { articleId, proveedor: { active: true } },
    orderBy: [{ esPreferido: 'desc' }, { precioCosto: 'asc' }],
  });
  // Sin proveedor cargado no se puede armar una orden de compra: el
  // articulo igual aparece en el widget de alertas de stock para que se
  // cargue un proveedor.
  if (!supplierLink) {
    return;
  }

  let order = await tx.ordenCompra.findFirst({
    where: { proveedorId: supplierLink.proveedorId, estado: 'BORRADOR' },
  });
  if (!order) {
    order = await tx.ordenCompra.create({ data: { proveedorId: supplierLink.proveedorId } });
  }

  const cantidad = Math.max(article.stockMinimo - article.stock, 1);
  await tx.ordenCompraItem.upsert({
    where: { ordenId_articleId: { ordenId: order.id, articleId } },
    create: { ordenId: order.id, articleId, cantidad, precioUnitario: supplierLink.precioCosto },
    update: { cantidad, precioUnitario: supplierLink.precioCosto },
  });

  const items = await tx.ordenCompraItem.findMany({ where: { ordenId: order.id } });
  const total = items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);
  await tx.ordenCompra.update({ where: { id: order.id }, data: { total } });
}

export const PurchaseOrdersService = { syncDraftForArticle };
