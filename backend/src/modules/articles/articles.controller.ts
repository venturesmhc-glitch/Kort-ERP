import type { Request, Response } from 'express';
import { AppError } from '../../utils/errors.js';
import {
  createArticleSchema,
  createMovementSchema,
  updateArticleSchema,
} from './articles.schema.js';
import * as articlesService from './articles.service.js';

export async function listArticlesHandler(_req: Request, res: Response) {
  const articles = await articlesService.listArticles();
  res.json(articles);
}

export async function listLowStockHandler(_req: Request, res: Response) {
  const articles = await articlesService.listLowStock();
  res.json(articles);
}

export async function getArticleHandler(req: Request, res: Response) {
  const article = await articlesService.getArticle(req.params.id);
  res.json(article);
}

export async function createArticleHandler(req: Request, res: Response) {
  const input = createArticleSchema.parse(req.body);
  const article = await articlesService.createArticle(input);
  res.status(201).json(article);
}

export async function updateArticleHandler(req: Request, res: Response) {
  const input = updateArticleSchema.parse(req.body);
  const article = await articlesService.updateArticle(req.params.id, input);
  res.json(article);
}

export async function deleteArticleHandler(req: Request, res: Response) {
  await articlesService.deleteArticle(req.params.id);
  res.status(204).send();
}

export async function listMovementsHandler(req: Request, res: Response) {
  const movements = await articlesService.listMovements(req.params.id);
  res.json(movements);
}

export async function createMovementHandler(req: Request, res: Response) {
  const input = createMovementSchema.parse(req.body);
  const article = await articlesService.createMovement(req.params.id, input);
  res.status(201).json(article);
}

export async function uploadArticleImageHandler(req: Request, res: Response) {
  if (!req.file) {
    throw new AppError('No se envio ninguna imagen');
  }
  const article = await articlesService.uploadArticleImage(req.params.id, {
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });
  res.json(article);
}
