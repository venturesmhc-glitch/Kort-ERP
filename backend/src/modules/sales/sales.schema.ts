import { z } from 'zod';
import { paginationQuerySchema } from '../../utils/pagination.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const saleItemSchema = z.object({
  articleId: z.string().uuid('Articulo invalido'),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  unitPrice: z.number().nonnegative('El precio no puede ser negativo').optional(),
});

const newClientSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z.string().min(6, 'Telefono invalido'),
  email: z
    .union([z.string().email('Email invalido'), z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const createSaleSchema = z
  .object({
    items: z.array(saleItemSchema).min(1, 'Agrega al menos un articulo'),
    clientId: z.string().uuid('Cliente invalido').optional(),
    client: newClientSchema.optional(),
    discountCode: z.string().trim().min(1, 'El codigo es requerido').optional(),
  })
  .refine((data) => !(data.clientId && data.client), {
    message: 'Elegi un cliente existente o cargá uno nuevo, no ambos',
    path: ['client'],
  });

export const listSalesQuerySchema = paginationQuerySchema.extend({
  dateFrom: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  articleId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
