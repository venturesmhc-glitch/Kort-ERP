import { z } from 'zod';

const baseFields = {
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Email invalido'),
  role: z.enum(['DEV', 'ENCARGADO', 'BARBERO']),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
};

export const createUserSchema = z.object({
  ...baseFields,
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres'),
  active: z.boolean().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  ...baseFields,
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres').optional(),
  active: z.boolean(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
