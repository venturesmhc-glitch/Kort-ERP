import { Router } from 'express';
import { verifyToken } from '../../middleware/auth.js';
import { authorize } from '../../middleware/authorize.js';
import { publicWriteLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  createAppointmentHandler,
  createWorkScheduleHandler,
  deleteWorkScheduleHandler,
  getAvailabilityHandler,
  getSettingsHandler,
  listAppointmentsHandler,
  listWorkSchedulesHandler,
  rescheduleAppointmentHandler,
  updateAppointmentStatusHandler,
  updateSettingsHandler,
  updateWorkScheduleHandler,
} from './appointments.controller.js';

// Turnos: Barbero ve/gestiona solo los propios (filtrado en el service), Encargado
// y Dev ven todos. Horarios de atencion y config global: escritura solo Encargado/Dev.
export const appointmentsRouter = Router();
appointmentsRouter.use(verifyToken, authorize('DEV', 'ENCARGADO', 'BARBERO'));

appointmentsRouter.get('/', asyncHandler(listAppointmentsHandler));
appointmentsRouter.put('/:id/status', asyncHandler(updateAppointmentStatusHandler));
appointmentsRouter.put('/:id/reschedule', asyncHandler(rescheduleAppointmentHandler));

appointmentsRouter.get('/schedules', asyncHandler(listWorkSchedulesHandler));
appointmentsRouter.post(
  '/schedules',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(createWorkScheduleHandler)
);
appointmentsRouter.put(
  '/schedules/:id',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(updateWorkScheduleHandler)
);
appointmentsRouter.delete(
  '/schedules/:id',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(deleteWorkScheduleHandler)
);

appointmentsRouter.get('/settings', asyncHandler(getSettingsHandler));
appointmentsRouter.put(
  '/settings',
  authorize('DEV', 'ENCARGADO'),
  asyncHandler(updateSettingsHandler)
);

// Lectura de disponibilidad y creacion de turno, sin autenticacion (landing).
export const publicAppointmentsRouter = Router();
publicAppointmentsRouter.get('/availability', asyncHandler(getAvailabilityHandler));
publicAppointmentsRouter.post('/', publicWriteLimiter, asyncHandler(createAppointmentHandler));
