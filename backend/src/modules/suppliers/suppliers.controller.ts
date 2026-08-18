import type { Request, Response } from 'express';
import {
  createSupplierSchema,
  updateSupplierSchema,
  upsertSupplierProductSchema,
} from './suppliers.schema.js';
import * as suppliersService from './suppliers.service.js';

export async function listArticlesCatalogHandler(_req: Request, res: Response) {
  res.json(await suppliersService.listArticlesCatalog());
}

export async function listSuppliersHandler(_req: Request, res: Response) {
  res.json(await suppliersService.listSuppliers());
}

export async function getSupplierHandler(req: Request, res: Response) {
  res.json(await suppliersService.getSupplier(req.params.id));
}

export async function createSupplierHandler(req: Request, res: Response) {
  const input = createSupplierSchema.parse(req.body);
  res.status(201).json(await suppliersService.createSupplier(input));
}

export async function updateSupplierHandler(req: Request, res: Response) {
  const input = updateSupplierSchema.parse(req.body);
  res.json(await suppliersService.updateSupplier(req.params.id, input));
}

export async function deleteSupplierHandler(req: Request, res: Response) {
  await suppliersService.deleteSupplier(req.params.id);
  res.status(204).send();
}

export async function upsertSupplierProductHandler(req: Request, res: Response) {
  const input = upsertSupplierProductSchema.parse(req.body);
  res.status(201).json(await suppliersService.upsertSupplierProduct(req.params.id, input));
}

export async function removeSupplierProductHandler(req: Request, res: Response) {
  await suppliersService.removeSupplierProduct(req.params.id, req.params.articleId);
  res.status(204).send();
}

export async function listSuppliersForArticleHandler(req: Request, res: Response) {
  res.json(await suppliersService.listSuppliersForArticle(req.params.articleId));
}
