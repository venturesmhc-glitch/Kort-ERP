import { Router } from 'express';
import multer from 'multer';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/errors.js';
import {
  createArticleHandler,
  createMovementHandler,
  deleteArticleHandler,
  getArticleHandler,
  listArticlesHandler,
  listLowStockHandler,
  listMovementsHandler,
  updateArticleHandler,
  uploadArticleImageHandler,
} from './articles.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new AppError('El archivo debe ser una imagen'));
      return;
    }
    cb(null, true);
  },
});

// Articulos y Stock: fuera del alcance del rol Barbero (que se limita a
// Clientes, Turnos y Registro de cortes) - lectura y escritura solo Encargado/Dev.
export const articlesRouter = Router();
articlesRouter.use(verifyToken, authorize('DEV', 'ENCARGADO'));

articlesRouter.get('/', asyncHandler(listArticlesHandler));
articlesRouter.get('/low-stock', asyncHandler(listLowStockHandler));
articlesRouter.get('/:id', asyncHandler(getArticleHandler));
articlesRouter.post('/', asyncHandler(createArticleHandler));
articlesRouter.put('/:id', asyncHandler(updateArticleHandler));
articlesRouter.delete('/:id', asyncHandler(deleteArticleHandler));

articlesRouter.get('/:id/movements', asyncHandler(listMovementsHandler));
articlesRouter.post('/:id/movements', asyncHandler(createMovementHandler));

articlesRouter.post('/:id/image', upload.single('image'), asyncHandler(uploadArticleImageHandler));

// Lectura publica (sin auth): catalogo de merch para la tienda de la landing y
// para el registro de ventas del panel admin (accesible a los 3 roles, a
// diferencia de la gestion de Articulos/Stock que es solo Encargado/Dev).
export const publicArticlesRouter = Router();
publicArticlesRouter.get('/', asyncHandler(listArticlesHandler));
