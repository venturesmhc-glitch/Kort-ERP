import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const workedHoursQuerySchema = z.object({
  dateFrom: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
  dateTo: z.string().regex(dateRegex, 'Fecha invalida (YYYY-MM-DD)').optional(),
});

export type WorkedHoursQuery = z.infer<typeof workedHoursQuerySchema>;
