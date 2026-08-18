import type { Request, Response } from 'express';
import { businessSettingsSchema } from '@kort/shared';
import * as businessSettingsService from './business-settings.service.js';

export async function getBusinessSettingsHandler(_req: Request, res: Response) {
  const settings = await businessSettingsService.getBusinessSettings();
  res.json(settings);
}

export async function updateBusinessSettingsHandler(req: Request, res: Response) {
  const input = businessSettingsSchema.parse(req.body);
  const settings = await businessSettingsService.updateBusinessSettings(input);
  res.json(settings);
}
