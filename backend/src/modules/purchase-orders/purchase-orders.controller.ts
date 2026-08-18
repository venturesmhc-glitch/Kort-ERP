import type { Request, Response } from 'express';
import { listPurchaseOrdersQuerySchema, updatePurchaseOrderSchema } from './purchase-orders.schema.js';
import * as purchaseOrdersService from './purchase-orders.service.js';

export async function listOrdersHandler(req: Request, res: Response) {
  const filters = listPurchaseOrdersQuerySchema.parse(req.query);
  res.json(await purchaseOrdersService.listOrders(filters));
}

export async function getOrderHandler(req: Request, res: Response) {
  res.json(await purchaseOrdersService.getOrder(req.params.id));
}

export async function updateOrderHandler(req: Request, res: Response) {
  const input = updatePurchaseOrderSchema.parse(req.body);
  res.json(await purchaseOrdersService.updateOrder(req.params.id, input));
}

export async function confirmOrderHandler(req: Request, res: Response) {
  res.json(await purchaseOrdersService.confirmOrder(req.params.id));
}

export async function sendOrderHandler(req: Request, res: Response) {
  res.json(await purchaseOrdersService.sendOrder(req.params.id));
}

export async function receiveOrderHandler(req: Request, res: Response) {
  res.json(await purchaseOrdersService.receiveOrder(req.params.id));
}

export async function deleteOrderHandler(req: Request, res: Response) {
  await purchaseOrdersService.deleteOrder(req.params.id);
  res.status(204).send();
}
