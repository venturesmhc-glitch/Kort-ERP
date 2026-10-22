import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getGrowthSettingsHandler, updateGrowthSettingsHandler } from './growth-settings.controller.js';

// Fidelizacion y retencion: configuracion exclusiva de Dev/Encargado, mismo
// criterio que Descuentos/Tesoreria (Barbero no la necesita para trabajar).
export const growthSettingsRouter = Router();

growthSettingsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

growthSettingsRouter.get('/', asyncHandler(getGrowthSettingsHandler));
growthSettingsRouter.put('/', asyncHandler(updateGrowthSettingsHandler));
