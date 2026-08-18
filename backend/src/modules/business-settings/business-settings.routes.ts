import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/errors.js';
import { ALLOWED_IMAGE_MIME_TYPES } from '../../lib/storage/storageService.js';
import {
  getBusinessSettingsHandler,
  updateBusinessSettingsHandler,
  uploadBusinessImageHandler,
} from './business-settings.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(new AppError('El archivo debe ser una imagen (jpeg, png, webp o gif)'));
      return;
    }
    cb(null, true);
  },
});

// Nombre, contacto y tema de marca de la landing. Escritura solo Dev y
// Encargado desde /admin/negocio; la lectura no vive aca porque la landing
// publica no tiene sesion (ver publicBusinessSettingsRouter).
export const businessSettingsRouter = Router();
businessSettingsRouter.use(verifyToken);
businessSettingsRouter.put('/', authorize('DEV', 'ENCARGADO'), asyncHandler(updateBusinessSettingsHandler));
businessSettingsRouter.post(
  '/image/:field',
  authorize('DEV', 'ENCARGADO'),
  upload.single('image'),
  asyncHandler(uploadBusinessImageHandler)
);

// Lectura publica (sin auth): la landing, turnos y contacto la consumen sin
// usuario logueado.
export const publicBusinessSettingsRouter = Router();
publicBusinessSettingsRouter.get('/', asyncHandler(getBusinessSettingsHandler));
