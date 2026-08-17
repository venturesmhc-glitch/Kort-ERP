import { z } from 'zod';

export const clienteStepSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().min(1, 'El apellido es requerido'),
  telefono: z.string().min(6, 'Telefono invalido'),
  email: z.union([z.string().email('Email invalido'), z.literal('')]),
});

export type ClienteStepFormValues = z.infer<typeof clienteStepSchema>;
