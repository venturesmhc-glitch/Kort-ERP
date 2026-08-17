import type { Request, Response } from 'express';
import {
  createCategorySchema,
  createItemSchema,
  reorderItemsSchema,
  updateCategorySchema,
  updateItemSchema,
} from './catalogs.schema.js';
import * as catalogsService from './catalogs.service.js';

export async function listCategoriesHandler(_req: Request, res: Response) {
  const categories = await catalogsService.listCategories();
  res.json(categories);
}

export async function createCategoryHandler(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  const category = await catalogsService.createCategory(input);
  res.status(201).json(category);
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const input = updateCategorySchema.parse(req.body);
  const category = await catalogsService.updateCategory(req.params.key, input);
  res.json(category);
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  await catalogsService.deleteCategory(req.params.key);
  res.status(204).send();
}

export async function listItemsHandler(req: Request, res: Response) {
  const includeInactive = req.query.includeInactive === 'true';
  const items = await catalogsService.listItems(req.params.key, includeInactive);
  res.json(items);
}

export async function listPublicItemsHandler(req: Request, res: Response) {
  const items = await catalogsService.listPublicItems(req.params.key);
  res.json(items);
}

export async function createItemHandler(req: Request, res: Response) {
  const input = createItemSchema.parse(req.body);
  const item = await catalogsService.createItem(req.params.key, input);
  res.status(201).json(item);
}

export async function updateItemHandler(req: Request, res: Response) {
  const input = updateItemSchema.parse(req.body);
  const item = await catalogsService.updateItem(req.params.key, req.params.itemId, input);
  res.json(item);
}

export async function deleteItemHandler(req: Request, res: Response) {
  await catalogsService.deleteItem(req.params.key, req.params.itemId);
  res.status(204).send();
}

export async function reorderItemsHandler(req: Request, res: Response) {
  const input = reorderItemsSchema.parse(req.body);
  const items = await catalogsService.reorderItems(req.params.key, input);
  res.json(items);
}
