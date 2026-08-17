import type { Request, Response } from 'express';
import { createSaleSchema, listSalesQuerySchema } from './sales.schema.js';
import * as salesService from './sales.service.js';

export async function createSaleHandler(req: Request, res: Response) {
  const input = createSaleSchema.parse(req.body);
  const sale = await salesService.createSale(input, req.user!);
  res.status(201).json(sale);
}

export async function listSalesHandler(req: Request, res: Response) {
  const query = listSalesQuerySchema.parse(req.query);
  const sales = await salesService.listSales(query);
  res.json(sales);
}
