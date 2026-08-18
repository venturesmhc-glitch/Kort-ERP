import { z } from 'zod';

export const updatePurchaseOrderSchema = z.object({
  proveedorId: z.string().uuid('Proveedor invalido').optional(),
  items: z
    .array(
      z.object({
        articleId: z.string().uuid('Articulo invalido'),
        cantidad: z.number().int().positive('La cantidad debe ser mayor a 0'),
        precioUnitario: z.number().int().nonnegative('El precio no puede ser negativo'),
      })
    )
    .min(1, 'La orden debe tener al menos un producto'),
});

export const listPurchaseOrdersQuerySchema = z.object({
  estado: z.enum(['BORRADOR', 'CONFIRMADA', 'ENVIADA', 'RECIBIDA']).optional(),
  proveedorId: z.string().uuid().optional(),
});

export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>;
