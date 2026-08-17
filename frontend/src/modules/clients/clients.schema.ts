import { z } from 'zod';

export const clientFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
