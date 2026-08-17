import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createClientHandler,
  deleteClientHandler,
  getClientHandler,
  listClientsHandler,
  updateClientHandler,
} from './clients.controller.js';

// Clientes: accesible por los 3 roles (Dev, Encargado, Barbero) segun skills.md #4.
export const clientsRouter = Router();

clientsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));

clientsRouter.get('/', asyncHandler(listClientsHandler));
clientsRouter.get('/:id', asyncHandler(getClientHandler));
clientsRouter.post('/', asyncHandler(createClientHandler));
clientsRouter.put('/:id', asyncHandler(updateClientHandler));
clientsRouter.delete('/:id', asyncHandler(deleteClientHandler));
