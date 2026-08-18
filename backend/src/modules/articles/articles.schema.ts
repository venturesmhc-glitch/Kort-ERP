import { z } from 'zod';

const articleBaseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  tipoProductoId: z.string().uuid('Tipo de producto invalido'),
  price: z.number().nonnegative('El precio no puede ser negativo'),
  stock: z.number().int().nonnegative('El stock inicial no puede ser negativo').optional(),
  stockMinimo: z.number().int().nonnegative('El stock minimo no puede ser negativo').optional(),
  stockCritico: z.number().int().nonnegative('El stock critico no puede ser negativo').optional(),
  active: z.boolean().optional(),
});

function assertStockCriticoBelowMinimo(data: { stockMinimo?: number; stockCritico?: number }) {
  return (
    data.stockCritico === undefined ||
    data.stockMinimo === undefined ||
    data.stockCritico < data.stockMinimo
  );
}

const stockCriticoRefinement = {
  message: 'El stock critico debe ser menor al stock minimo',
  path: ['stockCritico'],
};

export const createArticleSchema = articleBaseSchema.refine(
  assertStockCriticoBelowMinimo,
  stockCriticoRefinement
);

// El stock no se edita directo aca (para no romper el historial de
// StockMovement) - se ajusta con los endpoints de movimiento.
export const updateArticleSchema = articleBaseSchema
  .omit({ stock: true })
  .partial()
  .refine(assertStockCriticoBelowMinimo, stockCriticoRefinement);

export const createMovementSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  reason: z.string().optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
