import { z } from 'zod';

export const supplierFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email('Ingresa un email valido').optional().or(z.literal('')),
  condicionesPago: z.string().optional(),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

export const supplierProductFormSchema = z.object({
  articleId: z.string().min(1, 'Selecciona un articulo'),
  precioCosto: z.coerce.number().int().nonnegative('El precio no puede ser negativo'),
  tiempoEntregaDias: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : Number(value)),
    z.number().int().nonnegative().optional()
  ),
  esPreferido: z.boolean().optional(),
});

export type SupplierProductFormValues = z.infer<typeof supplierProductFormSchema>;
