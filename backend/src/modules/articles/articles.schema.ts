import { z } from 'zod';

export const createArticleSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  tipoProductoId: z.string().uuid('Tipo de producto invalido'),
  price: z.number().nonnegative('El precio no puede ser negativo'),
  stock: z.number().int().nonnegative('El stock inicial no puede ser negativo').optional(),
  lowStockThreshold: z.number().int().nonnegative('El umbral no puede ser negativo').optional(),
  active: z.boolean().optional(),
});

// El stock no se edita directo aca (para no romper el historial de
// StockMovement) - se ajusta con los endpoints de movimiento.
export const updateArticleSchema = createArticleSchema.omit({ stock: true }).partial();

export const createMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  reason: z.string().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
