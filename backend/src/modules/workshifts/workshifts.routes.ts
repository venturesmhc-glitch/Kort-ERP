import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { getWorkedHoursHandler } from './workshifts.controller.js';

// Jornadas laborales: exclusivo de Encargado y Dev (ver skills.md #4 y #5.9).
export const workshiftsRouter = Router();
workshiftsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

workshiftsRouter.get('/', asyncHandler(getWorkedHoursHandler));
