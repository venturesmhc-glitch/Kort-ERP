import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createCategoryHandler,
  createItemHandler,
  deleteCategoryHandler,
  deleteItemHandler,
  listCategoriesHandler,
  listItemsHandler,
  listPublicItemsHandler,
  reorderItemsHandler,
  updateCategoryHandler,
  updateItemHandler,
} from './catalogs.controller.js';

// Parametrizados: lectura para cualquier usuario autenticado (dropdowns de Turnos,
// Cortes, Stock, etc.), escritura solo Encargado/Dev. Ver skills.md #5.11 y #4.
export const catalogsRouter = Router();

catalogsRouter.use(verifyToken);

catalogsRouter.get('/', authorize('DEV', 'ENCARGADO', 'BARBERO'), asyncHandler(listCategoriesHandler));
catalogsRouter.post('/', authorize('DEV', 'ENCARGADO'), asyncHandler(createCategoryHandler));
catalogsRouter.put('/:key', authorize('DEV', 'ENCARGADO'), asyncHandler(updateCategoryHandler));
catalogsRouter.delete('/:key', authorize('DEV', 'ENCARGADO'), asyncHandler(deleteCategoryHandler));

catalogsRouter.get(
  '/:key/items',
  authorize('DEV', 'ENCARGADO', 'BARBERO'),
  asyncHandler(listItemsHandler)
);
catalogsRouter.post('/:key/items', authorize('DEV', 'ENCARGADO'), asyncHandler(createItemHandler));
catalogsRouter.put(
  '/:key/items/reorder',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(reorderItemsHandler)
);
catalogsRouter.put(
  '/:key/items/:itemId',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(updateItemHandler)
);
catalogsRouter.delete(
  '/:key/items/:itemId',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(deleteItemHandler)
);

// Lectura publica (sin auth), restringida a una whitelist de keys en el service.
export const publicCatalogsRouter = Router();
publicCatalogsRouter.get('/:key/items', asyncHandler(listPublicItemsHandler));
