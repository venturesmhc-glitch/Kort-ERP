import type { Request, Response } from 'express';
import { createCutSchema } from './cuts.schema.js';
import * as cutsService from './cuts.service.js';

export async function createCutHandler(req: Request, res: Response) {
  const input = createCutSchema.parse(req.body);
  const cut = await cutsService.createCut(input, req.user!);
  res.status(201).json(cut);
}

export async function listCutsHandler(req: Request, res: Response) {
  const cuts = await cutsService.listCuts(req.user!);
  res.json(cuts);
}

export async function deleteCutHandler(req: Request, res: Response) {
  await cutsService.deleteCut(req.params.id);
  res.status(204).send();
}
