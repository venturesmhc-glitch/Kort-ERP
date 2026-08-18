import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { listNotificationsHandler } from './notifications.controller.js';

// Turnos nuevos + stock bajo, filtrado por rol dentro del service (Barbero no
// ve stock). Accesible a los 3 roles, igual que Clientes/Turnos.
export const notificationsRouter = Router();
notificationsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));
notificationsRouter.get('/', asyncHandler(listNotificationsHandler));
