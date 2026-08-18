import type { Request, Response } from 'express';
import { businessSettingsSchema } from '@kort/shared';
import * as businessSettingsService from './business-settings.service.js';
import { AppError, UnauthorizedError } from '../../utils/errors.js';
import { BUSINESS_IMAGE_FIELDS, type BusinessImageField } from './business-settings.service.js';

export async function getBusinessSettingsHandler(_req: Request, res: Response) {
  const settings = await businessSettingsService.getBusinessSettings();
  res.json(settings);
}

export async function updateBusinessSettingsHandler(req: Request, res: Response) {
  const input = businessSettingsSchema.parse(req.body);
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const settings = await businessSettingsService.updateBusinessSettings(input, req.user.role);
  res.json(settings);
}

export async function uploadBusinessImageHandler(req: Request, res: Response) {
  const field = req.params.field as BusinessImageField;
  if (!BUSINESS_IMAGE_FIELDS.includes(field)) {
    throw new AppError('Campo de imagen invalido');
  }
  if (!req.file) {
    throw new AppError('No se envio ninguna imagen');
  }
  const settings = await businessSettingsService.uploadBusinessImage(field, {
    buffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });
  res.json(settings);
}
