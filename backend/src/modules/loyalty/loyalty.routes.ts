import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listLoyaltyTransactionsHandler, redeemLoyaltyPointsHandler } from './loyalty.controller.js';

// Montado bajo /api/clients (ver app.ts), junto a clientsRouter. El canje
// genera un cupon de descuento (ver loyalty.service.ts redeemPoints) -
// restringido a Dev/Encargado, mismo criterio que Descuentos.
export const loyaltyRouter = Router();

loyaltyRouter.use(verifyToken);

loyaltyRouter.get('/:clientId/loyalty/transactions', asyncHandler(listLoyaltyTransactionsHandler));
loyaltyRouter.post(
  '/:clientId/loyalty/redeem',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(redeemLoyaltyPointsHandler)
);
