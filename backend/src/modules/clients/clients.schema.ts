import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

export const listClientsQuerySchema = paginationQuerySchema;

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
  email: z
    .union([z.string().email('Email invalido'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const updateClientSchema = createClientSchema.partial();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
