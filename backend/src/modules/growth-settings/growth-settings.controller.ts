import type { Request, Response } from 'express';
import { updateGrowthSettingsSchema } from './growth-settings.schema.js';
import * as growthSettingsService from './growth-settings.service.js';

export async function getGrowthSettingsHandler(_req: Request, res: Response) {
  const settings = await growthSettingsService.getGrowthSettings();
  res.json(settings);
}

export async function updateGrowthSettingsHandler(req: Request, res: Response) {
  const input = updateGrowthSettingsSchema.parse(req.body);
  const settings = await growthSettingsService.updateGrowthSettings(input);
  res.json(settings);
}
