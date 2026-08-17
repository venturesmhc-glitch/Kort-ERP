import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dayOfWeekEnum = z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);

export const availabilityQuerySchema = z.object({
  barberoId: z.string().uuid('Barbero invalido'),
  date: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)'),
});

export const createAppointmentSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
  email: z
    .union([z.string().email('Email invalido'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
  barberoId: z.string().uuid('Barbero invalido'),
  tipoCorteId: z.string().uuid('Tipo de corte invalido'),
  date: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)'),
  time: z.string().regex(timeRegex, 'Horario invalido (HH:mm)'),
  // Vinculo opcional con un pedido de merch ya confirmado desde el flujo "ver
  // mercancia" del wizard (ver merch.service.ts / StorePage.tsx).
  merchSaleId: z.string().uuid('Pedido invalido').optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

export const rescheduleAppointmentSchema = z.object({
  date: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)'),
  time: z.string().regex(timeRegex, 'Horario invalido (HH:mm)'),
});

export const createWorkScheduleSchema = z
  .object({
    barberoId: z.string().uuid('Barbero invalido'),
    dayOfWeek: dayOfWeekEnum,
    startTime: z.string().regex(timeRegex, 'Horario invalido (HH:mm)'),
    endTime: z.string().regex(timeRegex, 'Horario invalido (HH:mm)'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'El horario de inicio debe ser anterior al de fin',
    path: ['endTime'],
  });

export const updateWorkScheduleSchema = z
  .object({
    dayOfWeek: dayOfWeekEnum.optional(),
    startTime: z.string().regex(timeRegex, 'Horario invalido (HH:mm)').optional(),
    endTime: z.string().regex(timeRegex, 'Horario invalido (HH:mm)').optional(),
  })
  .refine((data) => !data.startTime || !data.endTime || data.startTime < data.endTime, {
    message: 'El horario de inicio debe ser anterior al de fin',
    path: ['endTime'],
  });

export const updateSettingsSchema = z.object({
  slotMinutes: z.number().int().positive().max(240, 'El lapso maximo es de 240 minutos'),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CreateWorkScheduleInput = z.infer<typeof createWorkScheduleSchema>;
export type UpdateWorkScheduleInput = z.infer<typeof updateWorkScheduleSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
