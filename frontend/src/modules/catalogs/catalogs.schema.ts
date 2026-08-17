import { z } from 'zod';

export const catalogItemFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  activo: z.boolean(),
});

export type CatalogItemFormValues = z.infer<typeof catalogItemFormSchema>;
