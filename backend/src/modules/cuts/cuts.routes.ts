import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createCutHandler, deleteCutHandler, listCutsHandler } from './cuts.controller.js';

// Registro de cortes: Barbero registra/ve los propios, Encargado/Dev ven todos y
// pueden borrar (correccion de cargas erroneas).
export const cutsRouter = Router();
cutsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));

cutsRouter.get('/', asyncHandler(listCutsHandler));
cutsRouter.post('/', asyncHandler(createCutHandler));
cutsRouter.delete('/:id', authorize('DEV', 'ENCARGADO'), asyncHandler(deleteCutHandler));
