import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createUserHandler,
  deleteUserHandler,
  listPublicBarberosHandler,
  listUsersHandler,
  updateUserHandler,
} from './users.controller.js';

// Lectura de usuarios: accesible por los 3 roles (ej. para elegir barbero en
// Turnos). Alta/edicion/baja quedan restringidas a Dev y Encargado.
export const usersRouter = Router();
usersRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));
usersRouter.get('/', asyncHandler(listUsersHandler));
usersRouter.post('/', authorize('DEV', 'ENCARGADO'), asyncHandler(createUserHandler));
usersRouter.put('/:id', authorize('DEV', 'ENCARGADO'), asyncHandler(updateUserHandler));
usersRouter.delete('/:id', authorize('DEV', 'ENCARGADO'), asyncHandler(deleteUserHandler));

// Lectura publica: lista de barberos activos para el wizard de turnos de la landing.
export const publicUsersRouter = Router();
publicUsersRouter.get('/barberos', asyncHandler(listPublicBarberosHandler));
