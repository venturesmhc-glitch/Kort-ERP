import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createCutSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
  email: z
    .union([z.string().email('Email invalido'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
  barberoId: z.string().uuid('Barbero invalido'),
  tipoCorteId: z.string().uuid('Tipo de corte invalido'),
  price: z.number().positive('El precio debe ser mayor a 0').optional(),
  photoUrl: z.string().optional(),
  appointmentId: z.string().uuid('Turno invalido').optional(),
  cutAt: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
});

export type CreateCutInput = z.infer<typeof createCutSchema>;
