import { Prisma } from '@prisma/client';
import type { AppointmentStatus, DayOfWeek } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import type { AuthUser } from '../../middleware/auth.js';
import type {
  CreateAppointmentInput,
  CreateWorkScheduleInput,
  RescheduleAppointmentInput,
  UpdateAppointmentStatusInput,
  UpdateSettingsInput,
  UpdateWorkScheduleInput,
} from './appointments.schema.js';

// Codigo de turno: 6 caracteres, alfabeto sin 0/O/1/I/L para que sea facil de
// leer/dictar por telefono o WhatsApp. Unico en base, con reintento en colision.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 5;

const DAY_OF_WEEK_BY_JS_INDEX: DayOfWeek[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
}

function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// Ganchos de notificacion: la integracion con proveedores reales (mail, WhatsApp
// Business API) es una etapa posterior del roadmap. Por ahora quedan como no-op
// con log, listos para conectar el proveedor real sin tocar el resto del flujo.
export const NotificationService = {
  async sendAppointmentConfirmation(appointment: { code: string; scheduledAt: Date }) {
    console.log(
      `[NotificationService] Mail de confirmacion turno ${appointment.code} (${appointment.scheduledAt.toISOString()}) - no-op, falta integrar proveedor de mail`
    );
  },
  async scheduleAppointmentReminder(appointment: { code: string; scheduledAt: Date }) {
    console.log(
      `[NotificationService] Recordatorio WhatsApp turno ${appointment.code} programado 6hs antes de ${appointment.scheduledAt.toISOString()} - no-op, falta integrar proveedor de WhatsApp`
    );
  },
};

// --- Configuracion global (slotMinutes) ---

async function getOrCreateSettings() {
  return prisma.appointmentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export function getAppointmentSettings() {
  return getOrCreateSettings();
}

export function updateAppointmentSettings(input: UpdateSettingsInput) {
  return prisma.appointmentSettings.upsert({
    where: { id: 1 },
    update: { slotMinutes: input.slotMinutes },
    create: { id: 1, slotMinutes: input.slotMinutes },
  });
}

// --- Horarios de atencion (WorkSchedule) ---

export function listWorkSchedules(barberoId?: string) {
  return prisma.workSchedule.findMany({
    where: barberoId ? { barberoId } : undefined,
    include: { barbero: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: [{ barberoId: 'asc' }, { dayOfWeek: 'asc' }],
  });
}

async function getBarbero(barberoId: string) {
  const barbero = await prisma.user.findUnique({ where: { id: barberoId } });
  if (!barbero || barbero.role !== 'BARBERO' || !barbero.active) {
    throw new NotFoundError('Barbero no encontrado');
  }
  return barbero;
}

export async function createWorkSchedule(input: CreateWorkScheduleInput) {
  await getBarbero(input.barberoId);

  try {
    return await prisma.workSchedule.create({ data: input });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError('Ya existe un horario cargado para ese barbero en ese dia');
    }
    throw error;
  }
}

async function getWorkSchedule(id: string) {
  const schedule = await prisma.workSchedule.findUnique({ where: { id } });
  if (!schedule) {
    throw new NotFoundError('Horario no encontrado');
  }
  return schedule;
}

export async function updateWorkSchedule(id: string, input: UpdateWorkScheduleInput) {
  await getWorkSchedule(id);

  try {
    return await prisma.workSchedule.update({ where: { id }, data: input });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError('Ya existe un horario cargado para ese barbero en ese dia');
    }
    throw error;
  }
}

export async function deleteWorkSchedule(id: string) {
  await getWorkSchedule(id);
  await prisma.workSchedule.delete({ where: { id } });
}

// --- Disponibilidad ---

export async function getAvailableSlots(barberoId: string, date: string) {
  await getBarbero(barberoId);

  const dayOfWeek = DAY_OF_WEEK_BY_JS_INDEX[new Date(`${date}T00:00:00`).getDay()];
  const schedule = await prisma.workSchedule.findUnique({
    where: { barberoId_dayOfWeek: { barberoId, dayOfWeek } },
  });
  if (!schedule) {
    return [];
  }

  const settings = await getOrCreateSettings();
  const dayStart = combineDateTime(date, '00:00');
  const dayEnd = combineDateTime(date, '23:59');

  const existing = await prisma.appointment.findMany({
    where: {
      barberoId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { not: 'CANCELLED' },
    },
    select: { scheduledAt: true },
  });
  const takenTimes = new Set(existing.map((appointment) => appointment.scheduledAt.getTime()));

  const slots: string[] = [];
  const scheduleEnd = toMinutes(schedule.endTime);
  for (
    let minutes = toMinutes(schedule.startTime);
    minutes + settings.slotMinutes <= scheduleEnd;
    minutes += settings.slotMinutes
  ) {
    const time = toTimeString(minutes);
    const slotDate = combineDateTime(date, time);
    if (!takenTimes.has(slotDate.getTime())) {
      slots.push(time);
    }
  }

  return slots;
}

// --- Turnos ---

const APPOINTMENT_INCLUDE = {
  client: true,
  barbero: { select: { id: true, firstName: true, lastName: true } },
  tipoCorte: { select: { id: true, name: true } },
} satisfies Prisma.AppointmentInclude;

// Vinculo opcional con un pedido de merch ya confirmado (ver
// merch.service.ts / StorePage.tsx: "ver mercancia" antes de confirmar el
// turno). Es un vinculo best-effort - si el pedido ya no es valido (ya
// reclamado, no existe, no es de canal MERCH) no bloqueamos la creacion del
// turno por esto.
async function attachMerchSaleIfValid(merchSaleId: string, appointmentId: string) {
  await prisma.sale.updateMany({
    where: { id: merchSaleId, channel: 'MERCH', appointmentId: null },
    data: { appointmentId },
  });
}

export async function createAppointment(input: CreateAppointmentInput) {
  await getBarbero(input.barberoId);

  const tipoCorte = await prisma.parameterItem.findUnique({ where: { id: input.tipoCorteId } });
  if (!tipoCorte || tipoCorte.deletedAt || !tipoCorte.active) {
    throw new NotFoundError('Tipo de corte no encontrado');
  }

  const dayOfWeek = DAY_OF_WEEK_BY_JS_INDEX[new Date(`${input.date}T00:00:00`).getDay()];
  const schedule = await prisma.workSchedule.findUnique({
    where: { barberoId_dayOfWeek: { barberoId: input.barberoId, dayOfWeek } },
  });
  if (!schedule || input.time < schedule.startTime || input.time >= schedule.endTime) {
    throw new ConflictError('El horario elegido esta fuera de la disponibilidad del barbero');
  }

  const scheduledAt = combineDateTime(input.date, input.time);
  const settings = await getOrCreateSettings();

  // Chequeo rapido para devolver un error claro antes de intentar el insert; la
  // garantia real contra reservas duplicadas es el constraint unico
  // [barberoId, scheduledAt] en la base (ver el catch de P2002 mas abajo), que
  // es atomico entre requests concurrentes.
  const clashing = await prisma.appointment.findFirst({
    where: { barberoId: input.barberoId, scheduledAt, status: { not: 'CANCELLED' } },
  });
  if (clashing) {
    throw new ConflictError('Ese horario ya no esta disponible, elegi otro');
  }

  const client = await findOrCreateClientByPhone({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
  });

  let appointment = null;
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS && !appointment; attempt += 1) {
    try {
      appointment = await prisma.appointment.create({
        data: {
          code: generateCode(),
          clientId: client.id,
          barberoId: input.barberoId,
          tipoCorteId: input.tipoCorteId,
          scheduledAt,
          durationMinutes: settings.slotMinutes,
          status: 'PENDING',
        },
        include: APPOINTMENT_INCLUDE,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      const target = (error.meta?.target as string[] | undefined) ?? [];
      if (!target.includes('code')) {
        // Choco el constraint [barberoId, scheduledAt]: alguien reservo ese
        // horario en el instante entre el chequeo previo y este insert.
        throw new ConflictError('Ese horario ya no esta disponible, elegi otro');
      }
      if (attempt === MAX_CODE_ATTEMPTS) {
        throw new ConflictError('No se pudo generar un codigo de turno unico, intenta de nuevo');
      }
    }
  }

  if (!appointment) {
    throw new ConflictError('No se pudo crear el turno');
  }

  if (input.merchSaleId) {
    await attachMerchSaleIfValid(input.merchSaleId, appointment.id);
  }

  await NotificationService.sendAppointmentConfirmation(appointment);
  await NotificationService.scheduleAppointmentReminder(appointment);

  return appointment;
}

export function listAppointments(user: AuthUser) {
  return prisma.appointment.findMany({
    where: user.role === 'BARBERO' ? { barberoId: user.id } : undefined,
    include: APPOINTMENT_INCLUDE,
    orderBy: { scheduledAt: 'desc' },
  });
}

async function getOwnedAppointment(id: string, user: AuthUser) {
  const appointment = await prisma.appointment.findUnique({ where: { id } });
  if (!appointment) {
    throw new NotFoundError('Turno no encontrado');
  }
  if (user.role === 'BARBERO' && appointment.barberoId !== user.id) {
    throw new NotFoundError('Turno no encontrado');
  }
  return appointment;
}

export async function updateAppointmentStatus(
  id: string,
  input: UpdateAppointmentStatusInput,
  user: AuthUser
) {
  const appointment = await getOwnedAppointment(id, user);
  return prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: input.status as AppointmentStatus },
    include: APPOINTMENT_INCLUDE,
  });
}

export async function rescheduleAppointment(
  id: string,
  input: RescheduleAppointmentInput,
  user: AuthUser
) {
  const appointment = await getOwnedAppointment(id, user);

  const dayOfWeek = DAY_OF_WEEK_BY_JS_INDEX[new Date(`${input.date}T00:00:00`).getDay()];
  const schedule = await prisma.workSchedule.findUnique({
    where: { barberoId_dayOfWeek: { barberoId: appointment.barberoId, dayOfWeek } },
  });
  if (!schedule || input.time < schedule.startTime || input.time >= schedule.endTime) {
    throw new ConflictError('El horario elegido esta fuera de la disponibilidad del barbero');
  }

  const scheduledAt = combineDateTime(input.date, input.time);

  try {
    return await prisma.appointment.update({
      where: { id: appointment.id },
      data: { scheduledAt, status: 'PENDING' },
      include: APPOINTMENT_INCLUDE,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ConflictError('Ese horario ya no esta disponible, elegi otro');
    }
    throw error;
  }
}
