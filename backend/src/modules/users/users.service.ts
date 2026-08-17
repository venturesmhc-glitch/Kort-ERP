import { prisma } from '../../lib/prisma.js';
import type { Role } from '@prisma/client';

const LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  active: true,
} as const;

export function listUsers(filter: { role?: Role; active?: boolean }) {
  return prisma.user.findMany({
    where: {
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.active !== undefined ? { active: filter.active } : {}),
    },
    select: LIST_SELECT,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}

export function listPublicBarberos() {
  return prisma.user.findMany({
    where: { role: 'BARBERO', active: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
}
