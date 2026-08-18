import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getBusinessSettingsHandler, updateBusinessSettingsHandler } from './business-settings.controller.js';

// Nombre, contacto y tema de marca de la landing. Escritura solo Dev y
// Encargado desde /admin/negocio; la lectura no vive aca porque la landing
// publica no tiene sesion (ver publicBusinessSettingsRouter).
export const businessSettingsRouter = Router();
businessSettingsRouter.use(verifyToken);
businessSettingsRouter.put('/', authorize('DEV', 'ENCARGADO'), asyncHandler(updateBusinessSettingsHandler));

// Lectura publica (sin auth): la landing, turnos y contacto la consumen sin
// usuario logueado.
export const publicBusinessSettingsRouter = Router();
publicBusinessSettingsRouter.get('/', asyncHandler(getBusinessSettingsHandler));
