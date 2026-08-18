import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  confirmOrderHandler,
  deleteOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  receiveOrderHandler,
  sendOrderHandler,
  updateOrderHandler,
} from './purchase-orders.controller.js';

// Plan Integral: mismo criterio que Proveedores, sin restriccion de rol
// adentro del gate de plan.
export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(verifyToken, requirePlan('INTEGRAL'));

purchaseOrdersRouter.get('/', asyncHandler(listOrdersHandler));
purchaseOrdersRouter.get('/:id', asyncHandler(getOrderHandler));
purchaseOrdersRouter.put('/:id', asyncHandler(updateOrderHandler));
purchaseOrdersRouter.post('/:id/confirm', asyncHandler(confirmOrderHandler));
purchaseOrdersRouter.post('/:id/send', asyncHandler(sendOrderHandler));
purchaseOrdersRouter.post('/:id/receive', asyncHandler(receiveOrderHandler));
purchaseOrdersRouter.delete('/:id', asyncHandler(deleteOrderHandler));
