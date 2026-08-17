import { z } from 'zod';

const keyPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createCategorySchema = z.object({
  key: z
    .string()
    .min(1, 'La clave es requerida')
    .regex(keyPattern, 'La clave debe ser minuscula, sin espacios (ej: tipos-corte)'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').optional(),
  description: z.string().optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  active: z.boolean().optional(),
  // Solo lo usan los items de la categoria "tipos-corte" (ver modulo Cortes);
  // el resto de los catalogos lo deja sin definir.
  price: z.number().int().nonnegative('El precio no puede ser negativo').optional(),
});

export const updateItemSchema = createItemSchema.partial();

export const reorderItemsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int(),
      })
    )
    .min(1, 'Se requiere al menos un item'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ReorderItemsInput = z.infer<typeof reorderItemsSchema>;
