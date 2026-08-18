import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getSettingsHandler, updateSettingsHandler } from './settings.controller.js';

// Cualquier rol autenticado puede leer el plan actual (el frontend lo
// necesita para decidir que mostrar en las pestanas del Plan Integral, ver
// PlanGate). Solo Dev puede cambiarlo.
export const settingsRouter = Router();

settingsRouter.use(verifyToken);

settingsRouter.get('/', asyncHandler(getSettingsHandler));
settingsRouter.put('/', authorize('DEV'), asyncHandler(updateSettingsHandler));
