import { z } from 'zod';

export const movimientoFormSchema = z.object({
  tipo: z.enum(['costo_fijo', 'costo_variable', 'ingreso']),
  categoriaId: z.string().min(1, 'Selecciona una categoria'),
  categoriaNombre: z.string().min(1),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  descripcion: z.string().optional(),
});

export type MovimientoFormValues = z.infer<typeof movimientoFormSchema>;
