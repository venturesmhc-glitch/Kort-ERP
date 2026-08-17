import { z } from 'zod';

export const articuloFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipoProductoId: z.string().min(1, 'Selecciona un tipo de producto'),
  tipoProductoNombre: z.string().min(1),
  precio: z.coerce.number().positive('El precio debe ser mayor a 0'),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
  imagenUrl: z.string().optional(),
});

export type ArticuloFormValues = z.infer<typeof articuloFormSchema>;
