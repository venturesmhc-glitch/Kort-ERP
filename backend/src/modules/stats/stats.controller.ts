import type { Request, Response } from 'express';
import { statsQuerySchema } from './stats.schema.js';
import { getBarberStats, getClientStats, getCutStats, getSaleStats } from './stats.service.js';

export async function getClientStatsHandler(req: Request, res: Response) {
  const query = statsQuerySchema.parse(req.query);
  res.json(await getClientStats(query));
}

export async function getBarberStatsHandler(req: Request, res: Response) {
  const query = statsQuerySchema.parse(req.query);
  res.json(await getBarberStats(query));
}

export async function getCutStatsHandler(req: Request, res: Response) {
  const query = statsQuerySchema.parse(req.query);
  res.json(await getCutStats(query));
}

export async function getSaleStatsHandler(req: Request, res: Response) {
  const query = statsQuerySchema.parse(req.query);
  res.json(await getSaleStats(query));
}
