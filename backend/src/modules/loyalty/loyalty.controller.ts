import type { Request, Response } from 'express';
import { redeemLoyaltyPointsSchema } from './loyalty.schema.js';
import * as loyaltyService from './loyalty.service.js';

export async function listLoyaltyTransactionsHandler(req: Request, res: Response) {
  const transactions = await loyaltyService.listLoyaltyTransactions(req.params.clientId);
  res.json(transactions);
}

export async function redeemLoyaltyPointsHandler(req: Request, res: Response) {
  const input = redeemLoyaltyPointsSchema.parse(req.body);
  const discount = await loyaltyService.redeemPoints(req.params.clientId, input.points);
  res.status(201).json(discount);
}
