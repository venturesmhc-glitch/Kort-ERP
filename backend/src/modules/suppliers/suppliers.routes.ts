import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { requirePlan } from '../../middleware/requirePlan.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createSupplierHandler,
  deleteSupplierHandler,
  getSupplierHandler,
  listArticlesCatalogHandler,
  listSuppliersForArticleHandler,
  listSuppliersHandler,
  removeSupplierProductHandler,
  updateSupplierHandler,
  upsertSupplierProductHandler,
} from './suppliers.controller.js';

// Plan Integral: sin restriccion de rol adentro del gate, Barbero tiene el
// mismo acceso que Dev/Encargado si el plan lo incluye (ver requirePlan.ts).
export const suppliersRouter = Router();

suppliersRouter.use(verifyToken, requirePlan('INTEGRAL'));

suppliersRouter.get('/', asyncHandler(listSuppliersHandler));
suppliersRouter.get('/articles-catalog', asyncHandler(listArticlesCatalogHandler));
suppliersRouter.get('/by-article/:articleId', asyncHandler(listSuppliersForArticleHandler));
suppliersRouter.get('/:id', asyncHandler(getSupplierHandler));
suppliersRouter.post('/', asyncHandler(createSupplierHandler));
suppliersRouter.put('/:id', asyncHandler(updateSupplierHandler));
suppliersRouter.delete('/:id', asyncHandler(deleteSupplierHandler));
suppliersRouter.post('/:id/products', asyncHandler(upsertSupplierProductHandler));
suppliersRouter.delete('/:id/products/:articleId', asyncHandler(removeSupplierProductHandler));
