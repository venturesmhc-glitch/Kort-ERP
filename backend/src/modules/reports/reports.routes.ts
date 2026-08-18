import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  exportContableReportHandler,
  exportStockReportHandler,
  exportVentasCortesReportHandler,
  getStockReportHandler,
} from './reports.controller.js';

// Plan Integral: mismo criterio que Proveedores/Ordenes de compra, sin
// restriccion de rol adentro del gate de plan.
export const reportsRouter = Router();

reportsRouter.use(verifyToken, requirePlan('INTEGRAL'));

reportsRouter.get('/stock', asyncHandler(getStockReportHandler));
reportsRouter.get('/stock/export', asyncHandler(exportStockReportHandler));
reportsRouter.get('/contable/export', asyncHandler(exportContableReportHandler));
reportsRouter.get('/ventas-cortes/export', asyncHandler(exportVentasCortesReportHandler));
