import { z } from 'zod';

export const corteFormSchema = z.object({
  clienteNombre: z.string().min(1, 'Selecciona un cliente'),
  clienteTelefono: z.string().min(1),
  barberoId: z.string().min(1, 'Selecciona un barbero'),
  barberoNombre: z.string().min(1),
  tipoCorteId: z.string().min(1, 'Selecciona un tipo de corte'),
  tipoCorteNombre: z.string().min(1),
  precio: z.coerce.number().positive('El precio debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  imagenUrl: z.string().optional(),
});

export type CorteFormValues = z.infer<typeof corteFormSchema>;
