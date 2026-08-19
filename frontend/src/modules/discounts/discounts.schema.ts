import { z } from 'zod';

export const DISCOUNT_TYPE_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Porcentaje sobre el total' },
  { value: 'FIXED_AMOUNT', label: 'Monto fijo sobre el total' },
  { value: 'ITEM_PERCENTAGE', label: 'Porcentaje por articulo/categoria' },
  { value: 'ITEM_FIXED_AMOUNT', label: 'Monto fijo por articulo/categoria' },
] as const;

export const DISCOUNT_SCOPE_OPTIONS = [
  { value: 'MERCH', label: 'Merchandising' },
  { value: 'CORTES', label: 'Cortes' },
  { value: 'BOTH', label: 'Ambos' },
] as const;

const optionalPositiveInt = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : Number(value)),
  z.number().int().positive().optional()
);

const optionalDate = z.preprocess(
  (value) => (value === '' || value === undefined || value === null ? undefined : value),
  z.string().optional()
);

export const discountFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'ITEM_PERCENTAGE', 'ITEM_FIXED_AMOUNT']),
  scope: z.enum(['MERCH', 'CORTES', 'BOTH']),
  value: z.coerce.number().int().positive('El valor debe ser mayor a 0'),
  maxDiscountAmount: optionalPositiveInt,
  minOrderAmount: optionalPositiveInt,
  maxUses: optionalPositiveInt,
  maxUsesPerUser: optionalPositiveInt,
  applicableItems: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  validFrom: optionalDate,
  validUntil: optionalDate,
  isActive: z.boolean().optional(),
});

export type DiscountFormValues = z.infer<typeof discountFormSchema>;
