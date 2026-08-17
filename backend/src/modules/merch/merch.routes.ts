import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { publicWriteLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { checkoutHandler, listPendingMerchHandler, updateMerchStatusHandler } from './merch.controller.js';

// Checkout publico de la tienda (sin auth), mismo patron que Turnos.
export const publicMerchRouter = Router();
publicMerchRouter.post('/checkout', publicWriteLimiter, asyncHandler(checkoutHandler));

// Gestion de pedidos pendientes de retiro: mismo alcance que Ventas/Stock,
// fuera del rol Barbero.
export const merchRouter = Router();
merchRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));
merchRouter.get('/pending', asyncHandler(listPendingMerchHandler));
merchRouter.put('/:id/status', asyncHandler(updateMerchStatusHandler));
