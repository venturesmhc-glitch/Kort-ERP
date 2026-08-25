import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import type { Role } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateUserInput, UpdateUserInput } from './users.schema.js';

const LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  esBarbero: true,
  dni: true,
  phone: true,
  address: true,
  active: true,
} as const;

// role=BARBERO siempre puede atender turnos/cortes, sin importar lo que
// mande el form; para el resto de los roles esBarbero es el toggle real
// (ver UserForm.tsx: "Tambien atiende turnos").
function resolveEsBarbero(role: Role, esBarbero: boolean | undefined): boolean {
  return role === 'BARBERO' ? true : (esBarbero ?? false);
}

export function listUsers(filter: { role?: Role; active?: boolean; esBarbero?: boolean }) {
  return prisma.user.findMany({
    where: {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
      ...(filter.esBarbero !== undefined ? { esBarbero: filter.esBarbero } : {}),
    },
    select: LIST_SELECT,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

// Solo Dev puede otorgar el rol Dev - Encargado gestiona el resto del equipo
// pero no se puede auto-promover ni crear otras cuentas tecnicas.
function assertCanAssignRole(actingUser: AuthUser, role: Role) {
  if (role === 'DEV' && actingUser.role !== 'DEV') {
    throw new ForbiddenError('Solo un usuario Dev puede asignar el rol Dev');
  }
}

export async function createUser(input: CreateUserInput, actingUser: AuthUser) {
  assertCanAssignRole(actingUser, input.role);

  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw new ConflictError('Ya existe un usuario con ese email');
  }
  if (input.dni) {
    const existingDni = await prisma.user.findUnique({ where: { dni: input.dni } });
    if (existingDni) {
      throw new ConflictError('Ya existe un usuario con ese DNI');
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  return prisma.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: hashedPassword,
      role: input.role,
      esBarbero: resolveEsBarbero(input.role, input.esBarbero),
      dni: input.dni || undefined,
      phone: input.phone || undefined,
      address: input.address || undefined,
      active: input.active ?? true,
    },
    select: LIST_SELECT,
  });
}

export async function updateUser(id: string, input: UpdateUserInput, actingUser: AuthUser) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }
  assertCanAssignRole(actingUser, input.role);

  if (input.email !== user.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) {
      throw new ConflictError('Ya existe un usuario con ese email');
    }
  }
  if (input.dni && input.dni !== user.dni) {
    const existingDni = await prisma.user.findUnique({ where: { dni: input.dni } });
    if (existingDni) {
      throw new ConflictError('Ya existe un usuario con ese DNI');
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: input.role,
      esBarbero: resolveEsBarbero(input.role, input.esBarbero),
      dni: input.dni || null,
      phone: input.phone || null,
      address: input.address || null,
      active: input.active,
      password: input.password ? await bcrypt.hash(input.password, 12) : undefined,
    },
    select: LIST_SELECT,
  });
}

// Baja logica, no fisica: User esta referenciado por Cortes, Ventas, Turnos,
// Tesoreria y Jornadas, asi que borrarlo de verdad rompe por FK o se lleva
// historial de negocio. "Eliminar" en la UI desactiva la cuenta (no puede
// loguearse mas, deja de listarse como barbero activo).
export async function deactivateUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }
  await prisma.user.update({ where: { id }, data: { active: false } });
}

export function listPublicBarberos() {
  return prisma.user.findMany({
    where: { active: true, esBarbero: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}
