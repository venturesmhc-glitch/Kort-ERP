import { Prisma } from '@prisma/client';
import type { AppointmentStatus, DayOfWeek, Discount } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import { calculateDiscountAmount, resolveEligibleDiscount } from '../discounts/discounts.service.js';
import { getBusinessSettings } from '../business-settings/business-settings.service.js';
import { sendEmail } from '../../lib/notifications/emailProvider.js';
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

interface AppointmentForNotification {
  id: string;
  code: string;
  scheduledAt: Date;
  client: { firstName: string; lastName: string; phone: string; email: string | null };
  barbero: { firstName: string; lastName: string };
  tipoCorte: { name: string };
}

const REMINDER_LEAD_MS = 6 * 60 * 60 * 1000;

function formatAppointmentDate(scheduledAt: Date): string {
  return scheduledAt.toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function confirmationEmailHtml(appointment: AppointmentForNotification, businessName: string): string {
  const fecha = formatAppointmentDate(appointment.scheduledAt);
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>${businessName}</h2>
      <p>Hola ${appointment.client.firstName}, tu turno quedo confirmado.</p>
      <ul>
        <li><strong>Fecha:</strong> ${fecha}</li>
        <li><strong>Con:</strong> ${appointment.barbero.firstName} ${appointment.barbero.lastName}</li>
        <li><strong>Servicio:</strong> ${appointment.tipoCorte.name}</li>
        <li><strong>Codigo de turno:</strong> ${appointment.code}</li>
      </ul>
      <p>Te vamos a escribir por WhatsApp unas horas antes como recordatorio.</p>
    </div>
  `;
}

// Confirmacion por mail (sincrona, best-effort) y recordatorio por WhatsApp
// (programado, ver ScheduledNotification + notifications/scheduler.service.ts
// para el disparo real 6hs antes). Ninguno de los dos debe poder tumbar la
// creacion/reprogramacion del turno: ambos absorben sus propios errores.
export const NotificationService = {
  async sendAppointmentConfirmation(appointment: AppointmentForNotification) {
    if (!appointment.client.email) return;
    try {
      const business = await getBusinessSettings();
      await sendEmail({
        to: appointment.client.email,
        subject: `Turno confirmado - ${business.name}`,
        html: confirmationEmailHtml(appointment, business.name),
      });
    } catch (error) {
      console.error('[NotificationService] No se pudo enviar el mail de confirmacion', error);
    }
  },
  async scheduleAppointmentReminder(appointment: AppointmentForNotification) {
    const sendAt = new Date(appointment.scheduledAt.getTime() - REMINDER_LEAD_MS);
    if (sendAt <= new Date()) {
      // El turno es en menos de 6hs: no tiene sentido programar un
      // recordatorio que ya venceria al crearse.
      return;
    }
    try {
      await prisma.scheduledNotification.create({
        data: { appointmentId: appointment.id, channel: 'WHATSAPP', sendAt },
      });
    } catch (error) {
      console.error('[NotificationService] No se pudo programar el recordatorio de WhatsApp', error);
    }
  },
  async cancelPendingReminders(appointmentId: string) {
    try {
      await prisma.scheduledNotification.updateMany({
        where: { appointmentId, channel: 'WHATSAPP', status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    } catch (error) {
      console.error('[NotificationService] No se pudieron cancelar los recordatorios pendientes', error);
    }
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

// Aplica el cupon (scope MERCH/BOTH) al pedido de merch que ya existe (se
// creo en el checkout de la tienda, antes de este paso del wizard) -
// totalAmount queda con el descuento restado desde ya, pero usesCount no se
// incrementa aca: se difiere a merch.service.ts updateMerchOrderStatus en la
// transicion a DELIVERED, para no contabilizar pedidos que terminan
// CANCELLED (mismo criterio que TreasuryService.recordIncomeFromSale).
async function applyDiscountToMerchSale(discount: Discount, saleId: string): Promise<boolean> {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, channel: 'MERCH', status: 'PENDING_PICKUP', discountId: null },
    include: { items: { include: { article: { select: { tipoProductoId: true } } } } },
  });
  if (!sale) {
    return false;
  }

  if (discount.minOrderAmount !== null && sale.totalAmount < discount.minOrderAmount) {
    return false;
  }

  const pricedItems = sale.items.map((item) => ({
    articleId: item.articleId,
    tipoProductoId: item.article.tipoProductoId,
    quantity: item.quantity,
    subtotal: item.subtotal,
  }));
  const discountAmount = calculateDiscountAmount(discount, pricedItems, sale.totalAmount);
  if (discountAmount <= 0) {
    return false;
  }

  await prisma.sale.update({
    where: { id: sale.id },
    data: { discountId: discount.id, discountAmount, totalAmount: sale.totalAmount - discountAmount },
  });
  return true;
}

// Reserva el cupon para el turno (ver Appointment.discountId en el schema) y,
// si corresponde, lo aplica ya mismo al pedido de merch vinculado. Best-effort
// a proposito: un problema con el cupon nunca debe tirar abajo la reserva del
// turno (mismo espiritu que attachMerchSaleIfValid).
async function applyDiscountCode(
  appointmentId: string,
  discountCode: string,
  merchSaleId: string | undefined
): Promise<{ corte: boolean; merch: boolean }> {
  try {
    const eligible = await resolveEligibleDiscount(discountCode);
    if (!eligible.ok) {
      return { corte: false, merch: false };
    }
    const { discount } = eligible;

    let corte = false;
    let merch = false;

    if (discount.scope === 'CORTES' || discount.scope === 'BOTH') {
      await prisma.appointment.update({ where: { id: appointmentId }, data: { discountId: discount.id } });
      corte = true;
    }

    if ((discount.scope === 'MERCH' || discount.scope === 'BOTH') && merchSaleId) {
      merch = await applyDiscountToMerchSale(discount, merchSaleId);
    }

    return { corte, merch };
  } catch (error) {
    console.error('[DiscountService] No se pudo aplicar el cupon al turno', error);
    return { corte: false, merch: false };
  }
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

  let discountApplied = { corte: false, merch: false };
  if (input.discountCode) {
    discountApplied = await applyDiscountCode(appointment.id, input.discountCode, input.merchSaleId);
  }

  await NotificationService.sendAppointmentConfirmation(appointment);
  await NotificationService.scheduleAppointmentReminder(appointment);

  return { ...appointment, discountApplied };
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
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: input.status as AppointmentStatus },
    include: APPOINTMENT_INCLUDE,
  });

  if (input.status === 'CANCELLED') {
    await NotificationService.cancelPendingReminders(updated.id);
  }

  return updated;
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

  let updated;
  try {
    updated = await prisma.appointment.update({
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

  // El recordatorio viejo (6hs antes del horario anterior) ya no aplica -
  // se cancela y se programa uno nuevo relativo al horario reprogramado.
  await NotificationService.cancelPendingReminders(updated.id);
  await NotificationService.scheduleAppointmentReminder(updated);

  return updated;
}
