import type { Request, Response } from 'express';
import { createTreasuryEntrySchema, listTreasuryEntriesQuerySchema, treasurySummaryQuerySchema } from './treasury.schema.js';
import * as treasuryService from './treasury.service.js';

export async function createEntryHandler(req: Request, res: Response) {
  const input = createTreasuryEntrySchema.parse(req.body);
  const entry = await treasuryService.createEntry(input, req.user!);
  res.status(201).json(entry);
}

export async function listEntriesHandler(req: Request, res: Response) {
  const query = listTreasuryEntriesQuerySchema.parse(req.query);
  const entries = await treasuryService.listEntries(query);
  res.json(entries);
}

export async function deleteEntryHandler(req: Request, res: Response) {
  await treasuryService.deleteEntry(req.params.id);
  res.status(204).send();
}

export async function getSummaryHandler(req: Request, res: Response) {
  const query = treasurySummaryQuerySchema.parse(req.query);
  const summary = await treasuryService.getSummary(query);
  res.json(summary);
}
