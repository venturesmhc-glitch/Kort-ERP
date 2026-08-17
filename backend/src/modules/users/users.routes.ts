import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listPublicBarberosHandler, listUsersHandler } from './users.controller.js';

// Lectura de usuarios (accesible por los 3 roles, ej. para elegir barbero en Turnos).
// No hay alta/edicion de usuarios en este modulo todavia.
export const usersRouter = Router();
usersRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));
usersRouter.get('/', asyncHandler(listUsersHandler));

// Lectura publica: lista de barberos activos para el wizard de turnos de la landing.
export const publicUsersRouter = Router();
publicUsersRouter.get('/barberos', asyncHandler(listPublicBarberosHandler));
