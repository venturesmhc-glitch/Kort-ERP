import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createTreasuryEntrySchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']),
    expenseKind: z.enum(['FIXED', 'VARIABLE']).optional(),
    categoryId: z.string().uuid('Categoria invalida'),
    amount: z.number().int().positive('El monto debe ser mayor a 0'),
    description: z.string().optional(),
    entryDate: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)'),
  })
  .refine((data) => data.type !== 'EXPENSE' || !!data.expenseKind, {
    message: 'Los egresos requieren indicar si son costo fijo o variable',
    path: ['expenseKind'],
  })
  .refine((data) => data.type !== 'INCOME' || !data.expenseKind, {
    message: 'Los ingresos no llevan costo fijo/variable',
    path: ['expenseKind'],
  });

export const listTreasuryEntriesQuerySchema = z.object({
  dateFrom: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  source: z.enum(['MANUAL', 'CUT', 'SALE']).optional(),
});

export const treasurySummaryQuerySchema = z.object({
  dateFrom: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
});

export type CreateTreasuryEntryInput = z.infer<typeof createTreasuryEntrySchema>;
export type ListTreasuryEntriesQuery = z.infer<typeof listTreasuryEntriesQuerySchema>;
export type TreasurySummaryQuery = z.infer<typeof treasurySummaryQuerySchema>;
