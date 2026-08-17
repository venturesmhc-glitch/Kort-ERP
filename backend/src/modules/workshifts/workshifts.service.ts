import { prisma } from '../../lib/prisma.js';
import type { Role, WorkSession } from '@prisma/client';
import { UnauthorizedError } from '../../utils/errors.js';
import type { WorkedHoursQuery } from './workshifts.schema.js';

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hs sin actividad, ver skills.md #4
const ACTIVITY_THROTTLE_MS = 60 * 1000; // no pisar lastActivityAt en cada request
const TRACKED_ROLES: Role[] = ['BARBERO', 'ENCARGADO'];

function parseLocalDate(iso: string, endOfDay = false) {
  return new Date(`${iso}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function defaultRange(query: WorkedHoursQuery) {
  const now = new Date();
  const from = query.dateFrom
    ? parseLocalDate(query.dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : now;
  return { from, to };
}

type StaleCheckable = Pick<WorkSession, 'logoutAt' | 'lastActivityAt'>;

function isSessionStale(session: StaleCheckable, now: Date) {
  return !session.logoutAt && now.getTime() - session.lastActivityAt.getTime() > INACTIVITY_TIMEOUT_MS;
}

function getEffectiveEnd(session: StaleCheckable, now: Date) {
  if (session.logoutAt) return session.logoutAt;
  return isSessionStale(session, now) ? session.lastActivityAt : now;
}

export function createSession(userId: string) {
  const now = new Date();
  return prisma.workSession.create({ data: { userId, loginAt: now, lastActivityAt: now } });
}

// Se llama al loguear: si quedo una sesion abierta sin cerrar (el usuario
// nunca volvio a usar el sistema, ej. se olvido la sesion abierta), la
// cerramos como TIMEOUT en su ultimo momento de actividad real antes de abrir
// la nueva - asi no se mezclan dos jornadas en una sola fila.
export async function closeStaleSessionsIfAny(userId: string) {
  const now = new Date();
  const openSessions = await prisma.workSession.findMany({ where: { userId, logoutAt: null } });
  await Promise.all(
    openSessions
      .filter((session) => isSessionStale(session, now))
      .map((session) =>
        prisma.workSession.update({
          where: { id: session.id },
          data: { logoutAt: session.lastActivityAt, closeReason: 'TIMEOUT' },
        })
      )
  );
}

export async function closeSession(userId: string, reason: 'MANUAL' | 'TIMEOUT' = 'MANUAL') {
  await prisma.workSession.updateMany({
    where: { userId, logoutAt: null },
    data: { logoutAt: new Date(), closeReason: reason },
  });
}

// Middleware de actividad (ver middleware/auth.ts): se llama (con await) en
// cada request autenticado de Barbero/Encargado, antes de dejarlo pasar. Ata
// la validez real del JWT a tener un WorkSession abierto y no vencido -
// ademas de alimentar Jornadas laborales, esto es lo que hace cumplir la
// regla de skills.md #4 ("pasan 2 horas sin actividad, se cierra la sesion
// automaticamente") a nivel de autenticacion, no solo de reporte de horas.
// Si no hay sesion abierta (nunca hubo login, o ya se cerro por logout/
// inactividad) el request se rechaza y hay que loguearse de nuevo - no se
// revive una jornada vieja silenciosamente.
export async function assertSessionActive(userId: string) {
  const openSession = await prisma.workSession.findFirst({
    where: { userId, logoutAt: null },
    orderBy: { loginAt: 'desc' },
  });

  const now = new Date();

  if (!openSession || isSessionStale(openSession, now)) {
    if (openSession) {
      await prisma.workSession.update({
        where: { id: openSession.id },
        data: { logoutAt: openSession.lastActivityAt, closeReason: 'TIMEOUT' },
      });
    }
    throw new UnauthorizedError('Sesion cerrada por inactividad, inicia sesion de nuevo');
  }

  if (now.getTime() - openSession.lastActivityAt.getTime() < ACTIVITY_THROTTLE_MS) {
    return;
  }

  await prisma.workSession.update({ where: { id: openSession.id }, data: { lastActivityAt: now } });
}

export const WorkSessionService = {
  createSession,
  closeStaleSessionsIfAny,
  closeSession,
  assertSessionActive,
};

interface WorkedHoursRow {
  barberoId: string;
  barberoNombre: string;
  fecha: string;
  entrada: Date;
  salida: Date;
  sesionAbierta: boolean;
}

// Horas trabajadas por barbero/dia: desde el primer login del dia hasta el
// ultimo logout (o el cierre efectivo por inactividad), cruzado con la
// cantidad de cortes registrados ese mismo dia (skills.md #5.9). Reutilizable
// desde Centro de estadisticas en vez de recalcular esto ahi.
export async function getWorkedHoursReport(query: WorkedHoursQuery) {
  const { from, to } = defaultRange(query);
  const now = new Date();

  const sessions = await prisma.workSession.findMany({
    where: { user: { role: { in: TRACKED_ROLES } }, loginAt: { gte: from, lte: to } },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { loginAt: 'asc' },
  });

  const rows = new Map<string, WorkedHoursRow>();
  for (const session of sessions) {
    const fecha = dayKey(session.loginAt);
    const key = `${session.userId}-${fecha}`;
    const salida = getEffectiveEnd(session, now);
    const sesionAbierta = !session.logoutAt && !isSessionStale(session, now);

    const existing = rows.get(key);
    if (!existing) {
      rows.set(key, {
        barberoId: session.userId,
        barberoNombre: `${session.user.firstName} ${session.user.lastName}`,
        fecha,
        entrada: session.loginAt,
        salida,
        sesionAbierta,
      });
    } else {
      if (session.loginAt < existing.entrada) existing.entrada = session.loginAt;
      if (salida > existing.salida) existing.salida = salida;
      existing.sesionAbierta = existing.sesionAbierta || sesionAbierta;
    }
  }

  const barberoIds = [...new Set(sessions.map((s) => s.userId))];
  const cuts = barberoIds.length
    ? await prisma.cut.findMany({
        where: { barberoId: { in: barberoIds }, cutAt: { gte: from, lte: to } },
        select: { barberoId: true, cutAt: true },
      })
    : [];
  const cutsPorDia = new Map<string, number>();
  for (const cut of cuts) {
    const key = `${cut.barberoId}-${dayKey(cut.cutAt)}`;
    cutsPorDia.set(key, (cutsPorDia.get(key) ?? 0) + 1);
  }

  return [...rows.values()]
    .map((row) => ({
      barberoId: row.barberoId,
      barberoNombre: row.barberoNombre,
      fecha: row.fecha,
      entrada: row.entrada,
      salida: row.salida,
      horasTrabajadas: (row.salida.getTime() - row.entrada.getTime()) / (60 * 60 * 1000),
      sesionAbierta: row.sesionAbierta,
      cortesRealizados: cutsPorDia.get(`${row.barberoId}-${row.fecha}`) ?? 0,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.barberoNombre.localeCompare(b.barberoNombre));
}
