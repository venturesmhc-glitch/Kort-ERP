import cron from 'node-cron';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { normalizeWhatsappPhone, sendWhatsappTemplate } from '../../lib/notifications/whatsappProvider.js';
import { getBusinessSettings } from '../business-settings/business-settings.service.js';
import { getGrowthSettings } from '../growth-settings/growth-settings.service.js';

const MAX_ATTEMPTS = 3;

// Encuesta de satisfaccion / pedido de resena tras un Corte (ver
// cuts.service.ts createCut/createCutFromAppointment). Best-effort: nunca
// debe poder tumbar el registro del corte, igual que
// NotificationService.scheduleAppointmentReminder. Se programa siempre a
// partir de "ahora" (no de Cut.cutAt, que puede venir backdateado si el
// corte se carga tarde) - lo que importa es cuanto tiempo paso desde que se
// registro, no la fecha del servicio.
export async function scheduleReviewRequest(cut: { id: string; clientId: string }): Promise<void> {
  try {
    const settings = await getGrowthSettings();
    if (!settings.reviewRequestEnabled) return;

    await prisma.scheduledClientMessage.create({
      data: {
        kind: 'REVIEW_REQUEST',
        clientId: cut.clientId,
        cutId: cut.id,
        sendAt: new Date(Date.now() + settings.reviewRequestDelayHours * 60 * 60 * 1000),
      },
    });
  } catch (error) {
    console.error('[RetentionService] No se pudo programar la solicitud de resena', error);
  }
}

// Barrido diario de clientes inactivos (ver Client.lastVisitAt): programa un
// mensaje de reactivacion inmediato (sendAt = ahora) por cada cliente
// elegible y marca lastReactivationSentAt ya mismo (no al enviarse) para que
// una corrida que se superponga con la siguiente no lo vuelva a tomar antes
// del cooldown.
export async function runReactivationSweep(): Promise<void> {
  const settings = await getGrowthSettings();
  if (!settings.reactivationEnabled) return;

  const now = new Date();
  const inactiveCutoff = new Date(now.getTime() - settings.reactivationInactiveDays * 24 * 60 * 60 * 1000);
  const cooldownCutoff = new Date(now.getTime() - settings.reactivationCooldownDays * 24 * 60 * 60 * 1000);

  const candidates = await prisma.client.findMany({
    where: {
      AND: [
        { OR: [{ lastVisitAt: { lt: inactiveCutoff } }, { lastVisitAt: null, createdAt: { lt: inactiveCutoff } }] },
        { OR: [{ lastReactivationSentAt: null }, { lastReactivationSentAt: { lt: cooldownCutoff } }] },
      ],
    },
    select: { id: true },
  });

  for (const candidate of candidates) {
    try {
      await prisma.client.update({ where: { id: candidate.id }, data: { lastReactivationSentAt: now } });
      await prisma.scheduledClientMessage.create({
        data: { kind: 'REACTIVATION', clientId: candidate.id, sendAt: now },
      });
    } catch (error) {
      console.error('[RetentionService] No se pudo programar la reactivacion del cliente', candidate.id, error);
    }
  }
}

async function buildReviewRequestMessage() {
  const settings = await getGrowthSettings();
  if (!settings.reviewRequestEnabled || !settings.googleReviewUrl) return null;
  return { templateName: env.whatsappReviewTemplate, extraParam: settings.googleReviewUrl };
}

async function buildReactivationMessage() {
  const settings = await getGrowthSettings();
  if (!settings.reactivationEnabled) return null;

  let code = '';
  if (settings.reactivationDiscountId) {
    const discount = await prisma.discount.findFirst({
      where: { id: settings.reactivationDiscountId, deletedAt: null, isActive: true },
      select: { code: true },
    });
    code = discount?.code ?? '';
  }
  return { templateName: env.whatsappReactivationTemplate, extraParam: code };
}

async function processDueClientMessage(message: {
  id: string;
  kind: 'REVIEW_REQUEST' | 'REACTIVATION';
  cutId: string | null;
  attempts: number;
  client: { firstName: string; lastName: string; phone: string };
}) {
  try {
    const built =
      message.kind === 'REVIEW_REQUEST' ? await buildReviewRequestMessage() : await buildReactivationMessage();

    if (!built) {
      // La funcionalidad se desactivo despues de programar el mensaje -
      // no tiene sentido mandarlo.
      await prisma.scheduledClientMessage.update({ where: { id: message.id }, data: { status: 'CANCELLED' } });
      return;
    }

    const business = await getBusinessSettings();
    await sendWhatsappTemplate({
      to: normalizeWhatsappPhone(message.client.phone),
      templateName: built.templateName,
      bodyParams: [message.client.firstName, business.name, built.extraParam],
    });

    await prisma.scheduledClientMessage.update({
      where: { id: message.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (error) {
    const attempts = message.attempts + 1;
    const lastError = error instanceof Error ? error.message : String(error);
    console.error(`[RetentionService] Fallo el intento ${attempts} para ${message.id}`, error);
    await prisma.scheduledClientMessage.update({
      where: { id: message.id },
      data: { attempts, lastError, status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING' },
    });
  }
}

// Mismo patron que processDueReminders (ver scheduler.service.ts): secuencial,
// volumen bajo esperado.
export async function processDueClientMessages(): Promise<void> {
  const due = await prisma.scheduledClientMessage.findMany({
    where: { status: 'PENDING', sendAt: { lte: new Date() } },
    include: { client: { select: { firstName: true, lastName: true, phone: true } } },
  });

  for (const message of due) {
    await processDueClientMessage(message);
  }
}

let started = false;

export function startClientMessageScheduler(): void {
  if (started) return;
  started = true;

  let running = false;
  cron.schedule('*/5 * * * *', () => {
    if (running) return;
    running = true;
    processDueClientMessages()
      .catch((error) => console.error('[RetentionService] Error procesando mensajes de clientes', error))
      .finally(() => {
        running = false;
      });
  });

  // Horario fijo (10am) para que el envio real (unos minutos despues, via el
  // cron de arriba) caiga en horario comercial, no de madrugada.
  let sweepRunning = false;
  cron.schedule('0 10 * * *', () => {
    if (sweepRunning) return;
    sweepRunning = true;
    runReactivationSweep()
      .catch((error) => console.error('[RetentionService] Error en el barrido de reactivacion', error))
      .finally(() => {
        sweepRunning = false;
      });
  });

  console.log('[RetentionService] Scheduler de mensajes de clientes iniciado (cada 5 min + barrido diario 10am)');
}
