import { z } from 'zod';

export const ventaItemFormSchema = z.object({
  articuloId: z.string().min(1, 'Selecciona un articulo'),
  articuloNombre: z.string().min(1),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().nonnegative('El precio no puede ser negativo'),
});

export type VentaItemFormValues = z.infer<typeof ventaItemFormSchema>;

export const clienteVentaFormSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
});

export type ClienteVentaFormValues = z.infer<typeof clienteVentaFormSchema>;
