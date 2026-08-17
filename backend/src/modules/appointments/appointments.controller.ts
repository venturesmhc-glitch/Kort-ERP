import type { Request, Response } from 'express';
import * as appointmentsService from './appointments.service.js';
import {
  availabilityQuerySchema,
  createAppointmentSchema,
  createWorkScheduleSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
  updateSettingsSchema,
  updateWorkScheduleSchema,
} from './appointments.schema.js';

// --- Publico ---

export async function getAvailabilityHandler(req: Request, res: Response) {
  const query = availabilityQuerySchema.parse({
    barberoId: req.query.barberoId,
    date: req.query.date,
  });
  const slots = await appointmentsService.getAvailableSlots(query.barberoId, query.date);
  res.json(slots);
}

export async function createAppointmentHandler(req: Request, res: Response) {
  const input = createAppointmentSchema.parse(req.body);
  const appointment = await appointmentsService.createAppointment(input);
  res.status(201).json(appointment);
}

// --- Panel admin ---

export async function listAppointmentsHandler(req: Request, res: Response) {
  const appointments = await appointmentsService.listAppointments(req.user!);
  res.json(appointments);
}

export async function updateAppointmentStatusHandler(req: Request, res: Response) {
  const input = updateAppointmentStatusSchema.parse(req.body);
  const appointment = await appointmentsService.updateAppointmentStatus(
    req.params.id,
    input,
    req.user!
  );
  res.json(appointment);
}

export async function rescheduleAppointmentHandler(req: Request, res: Response) {
  const input = rescheduleAppointmentSchema.parse(req.body);
  const appointment = await appointmentsService.rescheduleAppointment(
    req.params.id,
    input,
    req.user!
  );
  res.json(appointment);
}

export async function listWorkSchedulesHandler(req: Request, res: Response) {
  const barberoId = typeof req.query.barberoId === 'string' ? req.query.barberoId : undefined;
  const schedules = await appointmentsService.listWorkSchedules(barberoId);
  res.json(schedules);
}

export async function createWorkScheduleHandler(req: Request, res: Response) {
  const input = createWorkScheduleSchema.parse(req.body);
  const schedule = await appointmentsService.createWorkSchedule(input);
  res.status(201).json(schedule);
}

export async function updateWorkScheduleHandler(req: Request, res: Response) {
  const input = updateWorkScheduleSchema.parse(req.body);
  const schedule = await appointmentsService.updateWorkSchedule(req.params.id, input);
  res.json(schedule);
}

export async function deleteWorkScheduleHandler(req: Request, res: Response) {
  await appointmentsService.deleteWorkSchedule(req.params.id);
  res.status(204).send();
}

export async function getSettingsHandler(_req: Request, res: Response) {
  const settings = await appointmentsService.getAppointmentSettings();
  res.json(settings);
}

export async function updateSettingsHandler(req: Request, res: Response) {
  const input = updateSettingsSchema.parse(req.body);
  const settings = await appointmentsService.updateAppointmentSettings(input);
  res.json(settings);
}
