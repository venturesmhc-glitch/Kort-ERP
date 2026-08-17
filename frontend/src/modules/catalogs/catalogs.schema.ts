import { z } from 'zod';

export const catalogItemFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  activo: z.boolean(),
  // Solo se usa en la categoria "tipos-corte" (precio del corte, ver modulo Cortes).
  // Empty string -> undefined para no forzar 0 cuando se deja el campo vacio.
  precio: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : Number(value)),
    z.number().int().nonnegative('El precio no puede ser negativo').optional()
  ),
});

export type CatalogItemFormValues = z.infer<typeof catalogItemFormSchema>;
