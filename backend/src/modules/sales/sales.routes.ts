import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { createSaleHandler, listSalesHandler } from './sales.controller.js';

// Ventas: fuera del alcance del rol Barbero, igual que Articulos y Stock.
export const salesRouter = Router();
salesRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

salesRouter.get('/', asyncHandler(listSalesHandler));
salesRouter.post('/', asyncHandler(createSaleHandler));
