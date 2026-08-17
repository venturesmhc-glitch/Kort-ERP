import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateCutInput } from './cuts.schema.js';

// Gancho a Tesoreria: la integracion real es una etapa posterior del roadmap,
// mismo patron que NotificationService en Turnos.
export const TreasuryService = {
  async recordIncomeFromCut(cut: { id: string; price: number }) {
    console.log(
      `[TreasuryService] Ingreso por corte ${cut.id}: $${cut.price} - no-op, falta integrar Tesoreria`
    );
  },
};

const CUT_INCLUDE = {
  client: true,
  barbero: { select: { id: true, firstName: true, lastName: true } },
  tipoCorte: { select: { id: true, name: true } },
} satisfies Prisma.CutInclude;

export async function createCut(input: CreateCutInput, user: AuthUser) {
  const barbero = await prisma.user.findUnique({ where: { id: input.barberoId } });
  if (!barbero || barbero.role !== 'BARBERO' || !barbero.active) {
    throw new NotFoundError('Barbero no encontrado');
  }
  if (user.role === 'BARBERO' && user.id !== input.barberoId) {
    throw new ConflictError('Un barbero solo puede registrar sus propios cortes');
  }

  const tipoCorte = await prisma.parameterItem.findUnique({ where: { id: input.tipoCorteId } });
  if (!tipoCorte || tipoCorte.deletedAt || !tipoCorte.active) {
    throw new NotFoundError('Tipo de corte no encontrado');
  }

  const price = input.price ?? tipoCorte.price ?? undefined;
  if (!price || price <= 0) {
    throw new ConflictError(
      'Este tipo de corte no tiene precio configurado en Parametrizados, ingresa uno manualmente'
    );
  }

  const client = await findOrCreateClientByPhone({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
  });

  const cutAt = input.cutAt ? new Date(`${input.cutAt}T12:00:00`) : new Date();

  try {
    const cut = await prisma.$transaction(async (tx) => {
      if (input.appointmentId) {
        const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId } });
        if (!appointment) {
          throw new NotFoundError('Turno no encontrado');
        }
        if (appointment.barberoId !== input.barberoId || appointment.clientId !== client.id) {
          throw new ConflictError('El turno no pertenece a ese barbero y cliente');
        }
      }

      const created = await tx.cut.create({
        data: {
          clientId: client.id,
          barberoId: input.barberoId,
          tipoCorteId: input.tipoCorteId,
          price,
          photoUrl: input.photoUrl,
          appointmentId: input.appointmentId,
          cutAt,
        },
        include: CUT_INCLUDE,
      });

      if (input.appointmentId) {
        await tx.appointment.update({
          where: { id: input.appointmentId },
          data: { status: 'COMPLETED' },
        });
      }

      return created;
    });

    await TreasuryService.recordIncomeFromCut(cut);

    return cut;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Ese turno ya tiene un corte registrado');
    }
    throw error;
  }
}

export function listCuts(user: AuthUser) {
  return prisma.cut.findMany({
    where: user.role === 'BARBERO' ? { barberoId: user.id } : undefined,
    include: CUT_INCLUDE,
    orderBy: { cutAt: 'desc' },
  });
}

export async function deleteCut(id: string) {
  const cut = await prisma.cut.findUnique({ where: { id } });
  if (!cut) {
    throw new NotFoundError('Corte no encontrado');
  }
  await prisma.cut.delete({ where: { id } });
}
