import { z } from 'zod';

export const createSupplierSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Ingresa un email valido').optional().or(z.literal('')),
  condicionesPago: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const upsertSupplierProductSchema = z.object({
  articleId: z.string().uuid('Articulo invalido'),
  precioCosto: z.number().int().nonnegative('El precio de costo no puede ser negativo'),
  tiempoEntregaDias: z.number().int().nonnegative().optional(),
  esPreferido: z.boolean().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpsertSupplierProductInput = z.infer<typeof upsertSupplierProductSchema>;
