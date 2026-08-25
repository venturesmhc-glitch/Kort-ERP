import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { findOrCreateClientByPhone } from '../clients/clients.service.js';
import { TreasuryService } from '../treasury/treasury.service.js';
import { calculateCorteDiscountAmount, incrementUsesCount } from '../discounts/discounts.service.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateCutInput } from './cuts.schema.js';

const CUT_INCLUDE = {
  client: true,
  barbero: { select: { id: true, firstName: true, lastName: true } },
  tipoCorte: { select: { id: true, name: true } },
} satisfies Prisma.CutInclude;

export async function createCut(input: CreateCutInput, user: AuthUser) {
  const barbero = await prisma.user.findUnique({ where: { id: input.barberoId } });
  if (!barbero || !barbero.esBarbero || !barbero.active) {
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
      let finalPrice = price;
      let discountId: string | undefined;
      let discountAmount: number | undefined;

      if (input.appointmentId) {
        const appointment = await tx.appointment.findUnique({
          where: { id: input.appointmentId },
          include: { discount: true },
        });
        if (!appointment) {
          throw new NotFoundError('Turno no encontrado');
        }
        if (appointment.barberoId !== input.barberoId || appointment.clientId !== client.id) {
          throw new ConflictError('El turno no pertenece a ese barbero y cliente');
        }

        // El cupon se reservo al confirmar el turno (ver
        // appointments.service.ts applyDiscountCode); aca se redime de
        // verdad, sea el mismo dia o mucho despues. No se re-chequea vigencia
        // por fecha a proposito: el cupon ya se comprometio a este turno y un
        // corte tiene que poder completarse igual si vencio en el medio -
        // solo se valida que siga activo, no borrado y con usos disponibles.
        const discount = appointment.discount;
        if (
          discount &&
          discount.isActive &&
          !discount.deletedAt &&
          (discount.maxUses === null || discount.usesCount < discount.maxUses)
        ) {
          discountAmount = calculateCorteDiscountAmount(discount, price);
          finalPrice = price - discountAmount;
          discountId = discount.id;
          await incrementUsesCount(tx, discount.id, discount.maxUses);
        }
      }

      const created = await tx.cut.create({
        data: {
          clientId: client.id,
          barberoId: input.barberoId,
          tipoCorteId: input.tipoCorteId,
          price: finalPrice,
          discountId,
          discountAmount,
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

      await TreasuryService.recordIncomeFromCut(tx, created);

      return created;
    });

    return cut;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Ese turno ya tiene un corte registrado');
    }
    throw error;
  }
}

// Contraparte de createCut para cuando el corte surge de completar un turno
// desde la Agenda (ver appointments.service.ts updateAppointmentStatus) en vez
// de cargarlo a mano desde Cortes. A diferencia de createCut, el cliente/
// barbero/tipo de corte/cupon ya estan resueltos en el turno - no hace falta
// buscar/crear cliente por telefono ni recibir un input separado.
export async function createCutFromAppointment(appointmentId: string) {
  const existing = await prisma.cut.findUnique({ where: { appointmentId } });
  if (existing) {
    // Ya tiene un corte vinculado (por ejemplo, se completo antes desde
    // Cortes con "Vincular turno de hoy") - no duplicar.
    return existing;
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { discount: true, tipoCorte: true },
  });
  if (!appointment) {
    throw new NotFoundError('Turno no encontrado');
  }

  const price = appointment.tipoCorte.price;
  if (!price || price <= 0) {
    throw new ConflictError(
      'El tipo de corte de este turno no tiene precio configurado en Parametrizados, registralo manualmente desde Cortes'
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let finalPrice = price;
      let discountId: string | undefined;
      let discountAmount: number | undefined;

      const discount = appointment.discount;
      if (
        discount &&
        discount.isActive &&
        !discount.deletedAt &&
        (discount.maxUses === null || discount.usesCount < discount.maxUses)
      ) {
        discountAmount = calculateCorteDiscountAmount(discount, price);
        finalPrice = price - discountAmount;
        discountId = discount.id;
        await incrementUsesCount(tx, discount.id, discount.maxUses);
      }

      const created = await tx.cut.create({
        data: {
          clientId: appointment.clientId,
          barberoId: appointment.barberoId,
          tipoCorteId: appointment.tipoCorteId,
          price: finalPrice,
          discountId,
          discountAmount,
          appointmentId: appointment.id,
          cutAt: new Date(),
        },
        include: CUT_INCLUDE,
      });

      await TreasuryService.recordIncomeFromCut(tx, created);

      return created;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // Choco con otro request concurrente que ya lo creo - no es un error real.
      const alreadyCreated = await prisma.cut.findUnique({ where: { appointmentId } });
      if (alreadyCreated) return alreadyCreated;
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
  // La FK de treasury_entries.cutId es ON DELETE SET NULL: sin este paso el
  // ingreso automatico del corte queda huerfano (desvinculado pero sumando
  // igual en Tesoreria). Lo borramos junto con el corte para que no se
  // infle el total de ingresos con movimientos que ya no tienen origen.
  await prisma.$transaction([
    prisma.treasuryEntry.deleteMany({ where: { cutId: id, source: 'CUT' } }),
    prisma.cut.delete({ where: { id } }),
  ]);
}
