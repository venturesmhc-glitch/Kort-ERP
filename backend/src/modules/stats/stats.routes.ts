import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  getBarberStatsHandler,
  getClientStatsHandler,
  getCutStatsHandler,
  getSaleStatsHandler,
} from './stats.controller.js';

// Centro de estadisticas: exclusivo de Encargado y Dev (ver skills.md #5.10).
export const statsRouter = Router();
statsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

statsRouter.get('/clients', asyncHandler(getClientStatsHandler));
statsRouter.get('/barbers', asyncHandler(getBarberStatsHandler));
statsRouter.get('/cuts', asyncHandler(getCutStatsHandler));
statsRouter.get('/sales', asyncHandler(getSaleStatsHandler));
