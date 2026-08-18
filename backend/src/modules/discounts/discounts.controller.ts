import type { Request, Response } from 'express';
import { createDiscountSchema, updateDiscountSchema, validateDiscountSchema } from './discounts.schema.js';
import * as discountsService from './discounts.service.js';

export async function listDiscountsHandler(_req: Request, res: Response) {
  const discounts = await discountsService.listDiscounts();
  res.json(discounts);
}

export async function createDiscountHandler(req: Request, res: Response) {
  const input = createDiscountSchema.parse(req.body);
  const discount = await discountsService.createDiscount(input);
  res.status(201).json(discount);
}

export async function updateDiscountHandler(req: Request, res: Response) {
  const input = updateDiscountSchema.parse(req.body);
  const discount = await discountsService.updateDiscount(req.params.id, input);
  res.json(discount);
}

export async function deleteDiscountHandler(req: Request, res: Response) {
  await discountsService.deleteDiscount(req.params.id);
  res.status(204).send();
}

export async function validateDiscountHandler(req: Request, res: Response) {
  const input = validateDiscountSchema.parse(req.body);
  const result = await discountsService.validateDiscount(input);
  res.json(result);
}
