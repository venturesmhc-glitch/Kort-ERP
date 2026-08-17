import { z } from 'zod';
import { userBaseFields, userPasswordSchema } from '@kort/shared';

export const createUserSchema = z.object({
  ...userBaseFields,
  password: userPasswordSchema,
  active: z.boolean().optional(),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  ...userBaseFields,
  password: userPasswordSchema.optional(),
  active: z.boolean(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
