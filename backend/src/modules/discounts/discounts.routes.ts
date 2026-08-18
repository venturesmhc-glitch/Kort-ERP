import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { publicWriteLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createDiscountHandler,
  deleteDiscountHandler,
  listDiscountsHandler,
  updateDiscountHandler,
  validateDiscountHandler,
} from './discounts.controller.js';

// Gestion de cupones: fuera del alcance del rol Barbero, mismo criterio que
// Articulos/Ventas.
export const discountsRouter = Router();
discountsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));
discountsRouter.get('/', asyncHandler(listDiscountsHandler));
discountsRouter.post('/', asyncHandler(createDiscountHandler));
discountsRouter.patch('/:id', asyncHandler(updateDiscountHandler));
discountsRouter.delete('/:id', asyncHandler(deleteDiscountHandler));

// Validacion publica durante el checkout (mismo criterio que el checkout de
// Merch): sin auth, con rate limit por aceptar intentos repetidos de codigo.
export const publicDiscountsRouter = Router();
publicDiscountsRouter.post('/validate', publicWriteLimiter, asyncHandler(validateDiscountHandler));
