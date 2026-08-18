import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const stockReportQuerySchema = z.object({
  tipoProductoId: z.string().uuid().optional(),
  estado: z.enum(['ok', 'bajo', 'critico']).optional(),
  format: z.enum(['xlsx', 'pdf']).optional(),
});

export const dateRangeQuerySchema = z.object({
  dateFrom: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
});

export const ventasCortesQuerySchema = dateRangeQuerySchema.extend({
  barberoId: z.string().uuid().optional(),
});

export type StockReportQuery = z.infer<typeof stockReportQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;
export type VentasCortesQuery = z.infer<typeof ventasCortesQuerySchema>;
