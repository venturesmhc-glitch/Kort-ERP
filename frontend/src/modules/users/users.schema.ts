import { z } from 'zod';
import { userBaseFields, userPasswordSchema } from '@kort/shared';

export const userFormSchema = z.object({
  ...userBaseFields,
  active: z.boolean(),
  password: userPasswordSchema.optional().or(z.literal('')),
});

export type UserFormValues = z.infer<typeof userFormSchema>;
