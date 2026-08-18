import { prisma } from '../../lib/prisma.js';
import type { AuthUser } from '../../middleware/auth.js';

export type NotificationType = 'turno_nuevo' | 'stock_bajo';
export type NotificationPriority = 'alta' | 'media' | 'normal';

export interface NotificationDto {
  id: string;
  tipo: NotificationType;
  mensaje: string;
  fecha: string;
  link: string;
  prioridad: NotificationPriority;
}

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Notificaciones "computadas" en el momento (sin tabla nueva): agrega turnos
// pendientes de confirmar y stock bajo/critico, reutilizando el mismo
// criterio que ya usan Turnos y Articulos/Stock. El estado de leido/no leido
// se resuelve 100% en el frontend (ver notifications.ts del frontend), asi
// que aca no hace falta persistir nada.
export async function listNotifications(user: AuthUser): Promise<NotificationDto[]> {
  const notifications: NotificationDto[] = [];

  // Turnos nuevos: pendientes de confirmar, creados en los ultimos 7 dias
  // (evita que un turno pendiente muy viejo quede notificando para siempre).
  // Barbero solo ve los propios, igual que en listAppointments.
  const since = new Date(Date.now() - RECENT_WINDOW_MS);
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'PENDING',
      createdAt: { gte: since },
      barberoId: user.role === 'BARBERO' ? user.id : undefined,
    },
    include: {
      client: { select: { firstName: true, lastName: true } },
      barbero: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  for (const appointment of appointments) {
    const fecha = appointment.scheduledAt.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    notifications.push({
      id: `turno-${appointment.id}`,
      tipo: 'turno_nuevo',
      mensaje:
        `Nuevo turno: ${appointment.client.firstName} ${appointment.client.lastName} ` +
        `con ${appointment.barbero.firstName} ${appointment.barbero.lastName} - ${fecha}`,
      fecha: appointment.createdAt.toISOString(),
      link: '/admin/turnos',
      prioridad: 'normal',
    });
  }

  // Stock bajo/critico: fuera del alcance de Barbero (no tiene acceso a
  // Articulos y Stock, ver NAV_ITEMS en AdminLayout.tsx).
  if (user.role === 'DEV' || user.role === 'ENCARGADO') {
    const articles = await prisma.article.findMany({
      where: { active: true, stockMinimo: { not: null } },
      orderBy: { stock: 'asc' },
    });

    for (const article of articles) {
      const critico = article.stockCritico !== null && article.stock <= article.stockCritico;
      const bajo = !critico && article.stockMinimo !== null && article.stock <= article.stockMinimo;
      if (!critico && !bajo) continue;

      notifications.push({
        id: `stock-${article.id}`,
        tipo: 'stock_bajo',
        mensaje: `Stock ${critico ? 'critico' : 'bajo'}: ${article.name} (quedan ${article.stock})`,
        fecha: article.updatedAt.toISOString(),
        link: '/admin/articulos',
        prioridad: critico ? 'alta' : 'media',
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}
