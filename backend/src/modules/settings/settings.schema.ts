import { z } from 'zod';

export const updateSettingsSchema = z.object({
  plan: z.enum(['BASICO', 'INTEGRAL']),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
