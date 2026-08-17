import type { Request, Response } from 'express';
import { checkoutSchema, updateMerchStatusSchema } from './merch.schema.js';
import { createMerchOrder, listPendingMerchOrders, updateMerchOrderStatus } from './merch.service.js';

export async function checkoutHandler(req: Request, res: Response) {
  const input = checkoutSchema.parse(req.body);
  const sale = await createMerchOrder(input);
  res.status(201).json(sale);
}

export async function listPendingMerchHandler(_req: Request, res: Response) {
  const orders = await listPendingMerchOrders();
  res.json(orders);
}

export async function updateMerchStatusHandler(req: Request, res: Response) {
  const input = updateMerchStatusSchema.parse(req.body);
  const sale = await updateMerchOrderStatus(req.params.id, input);
  res.json(sale);
}
