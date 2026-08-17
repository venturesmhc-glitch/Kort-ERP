import { z } from 'zod';

export const userFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  email: z.string().email('Ingresa un email valido'),
  role: z.enum(['DEV', 'ENCARGADO', 'BARBERO']),
  dni: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  active: z.boolean(),
  password: z
    .string()
    .min(6, 'La contrasena debe tener al menos 6 caracteres')
    .optional()
    .or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
