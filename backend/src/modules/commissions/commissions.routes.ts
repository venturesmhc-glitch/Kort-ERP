import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getCommissionsHandler } from './commissions.controller.js';

// Comisiones: dato de nomina/payroll, mismo nivel de restriccion que
// Jornadas laborales y Centro de estadisticas (exclusivo Dev/Encargado, ver
// skills.md #4). Un Barbero no deberia poder ver el porcentaje/comision de
// otro.
export const commissionsRouter = Router();
commissionsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

commissionsRouter.get('/', asyncHandler(getCommissionsHandler));
