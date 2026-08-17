import { z } from 'zod';

export const ventaFormSchema = z.object({
  articuloId: z.string().min(1, 'Selecciona un articulo'),
  articuloNombre: z.string().min(1),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().positive('El precio debe ser mayor a 0'),
});

export type VentaFormValues = z.infer<typeof ventaFormSchema>;
