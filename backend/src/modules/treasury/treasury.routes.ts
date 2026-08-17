import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createEntryHandler,
  deleteEntryHandler,
  getSummaryHandler,
  listEntriesHandler,
} from './treasury.controller.js';

// Tesoreria: fuera del alcance del rol Barbero, igual que Stock y Ventas.
export const treasuryRouter = Router();
treasuryRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

treasuryRouter.get('/entries', asyncHandler(listEntriesHandler));
treasuryRouter.post('/entries', asyncHandler(createEntryHandler));
treasuryRouter.delete('/entries/:id', asyncHandler(deleteEntryHandler));
treasuryRouter.get('/summary', asyncHandler(getSummaryHandler));
