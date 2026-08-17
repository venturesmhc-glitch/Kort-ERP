import { z } from 'zod';

const merchItemSchema = z.object({
  articleId: z.string().uuid('Articulo invalido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
});

export const checkoutSchema = z.object({
  items: z.array(merchItemSchema).min(1, 'Agrega al menos un articulo'),
  client: z.object({
    firstName: z.string().min(1, 'El nombre es requerido'),
    lastName: z.string().min(1, 'El apellido es requerido'),
    phone: z.string().min(6, 'Telefono invalido'),
    email: z
      .union([z.string().email('Email invalido'), z.literal('')])
      .optional()
      .transform((value) => (value ? value : undefined)),
  }),
});

export const updateMerchStatusSchema = z.object({
  status: z.enum(['DELIVERED', 'CANCELLED']),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type UpdateMerchStatusInput = z.infer<typeof updateMerchStatusSchema>;
