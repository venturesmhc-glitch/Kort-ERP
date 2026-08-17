import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import type { CreateClientInput, UpdateClientInput } from './clients.schema.js';

export function listClients() {
  return prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) {
    throw new NotFoundError('Cliente no encontrado');
  }
  return client;
}

export async function createClient(input: CreateClientInput) {
  const existing = await prisma.client.findUnique({ where: { phone: input.phone } });
  if (existing) {
    throw new ConflictError('Ya existe un cliente con ese telefono');
  }

  return prisma.client.create({ data: input });
}

export async function updateClient(id: string, input: UpdateClientInput) {
  await getClient(id);

  if (input.phone) {
    const existing = await prisma.client.findUnique({ where: { phone: input.phone } });
    if (existing && existing.id !== id) {
      throw new ConflictError('Ya existe un cliente con ese telefono');
    }
  }

  return prisma.client.update({ where: { id }, data: input });
}

export async function deleteClient(id: string) {
  await getClient(id);
  await prisma.client.delete({ where: { id } });
}
