import cron from 'node-cron';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { normalizeWhatsappPhone, sendWhatsappTemplate } from '../../lib/notifications/whatsappProvider.js';

const MAX_ATTEMPTS = 3;

async function processDueReminder(notification: {
  id: string;
  attempts: number;
  appointment: {
    code: string;
    scheduledAt: Date;
    client: { firstName: string; lastName: string; phone: string };
    barbero: { firstName: string; lastName: string };
  };
}) {
  const { appointment } = notification;
  const fecha = appointment.scheduledAt.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    await sendWhatsappTemplate({
      to: normalizeWhatsappPhone(appointment.client.phone),
      templateName: env.whatsappReminderTemplate,
      bodyParams: [appointment.client.firstName, fecha, appointment.barbero.firstName, appointment.code],
    });
    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (error) {
    const attempts = notification.attempts + 1;
    const lastError = error instanceof Error ? error.message : String(error);
    console.error(`[ReminderScheduler] Fallo el intento ${attempts} para ${notification.id}`, error);
    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: {
        attempts,
        lastError,
        status: attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
      },
    });
  }
}

// Barre recordatorios WHATSAPP vencidos (sendAt <= ahora) y todavia PENDING.
// Se ejecuta secuencial (no Promise.all): el volumen esperado por corrida es
// bajo (una sola barberia, ventana de 5 min) y evita saturar la API de Meta
// con rafagas.
export async function processDueReminders(): Promise<void> {
  const due = await prisma.scheduledNotification.findMany({
    where: { channel: 'WHATSAPP', status: 'PENDING', sendAt: { lte: new Date() } },
    include: {
      appointment: {
        include: {
          client: { select: { firstName: true, lastName: true, phone: true } },
          barbero: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  for (const notification of due) {
    await processDueReminder(notification);
  }
}

let started = false;

// Corre cada 5 minutos. Guardia in-memory simple contra superposicion si una
// corrida tarda mas que el intervalo (no debería pasar con este volumen, pero
// evita procesar el mismo recordatorio dos veces en paralelo).
export function startReminderScheduler(): void {
  if (started) return;
  started = true;

  let running = false;
  cron.schedule('*/5 * * * *', () => {
    if (running) return;
    running = true;
    processDueReminders()
      .catch((error) => console.error('[ReminderScheduler] Error procesando recordatorios', error))
      .finally(() => {
        running = false;
      });
  });

  console.log('[ReminderScheduler] Scheduler de recordatorios WhatsApp iniciado (cada 5 min)');
}
