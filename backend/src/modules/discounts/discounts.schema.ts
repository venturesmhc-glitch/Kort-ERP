import { z } from 'zod';

const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'ITEM_PERCENTAGE', 'ITEM_FIXED_AMOUNT'] as const;

const codeSchema = z
  .string()
  .trim()
  .min(3, 'El codigo debe tener al menos 3 caracteres')
  .max(20, 'El codigo no puede superar los 20 caracteres')
  .regex(/^[a-zA-Z0-9]+$/, 'El codigo solo puede contener letras y numeros')
  .transform((value) => value.toUpperCase());

export const createDiscountSchema = z.object({
  code: codeSchema.optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(DISCOUNT_TYPES),
  value: z.number().int().positive('El valor debe ser mayor a 0'),
  maxDiscountAmount: z.number().int().positive('El tope debe ser mayor a 0').optional(),
  minOrderAmount: z.number().int().positive('El monto minimo debe ser mayor a 0').optional(),
  maxUses: z.number().int().positive('Los usos maximos deben ser mayor a 0').optional(),
  maxUsesPerUser: z.number().int().positive('Los usos por cliente deben ser mayor a 0').optional(),
  applicableItems: z.array(z.string().uuid('Articulo invalido')).optional(),
  applicableCategories: z.array(z.string().uuid('Categoria invalida')).optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

// Whitelist explicita de campos editables: mismos campos que la creacion, sin
// tocar id/code generado/usesCount/deletedAt/timestamps.
export const updateDiscountSchema = createDiscountSchema.partial();

const validateItemSchema = z.object({
  articleId: z.string().uuid('Articulo invalido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
});

export const validateDiscountSchema = z.object({
  code: z.string().trim().min(1, 'El codigo es requerido'),
  items: z.array(validateItemSchema).min(1, 'Agrega al menos un articulo'),
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type ValidateDiscountInput = z.infer<typeof validateDiscountSchema>;
