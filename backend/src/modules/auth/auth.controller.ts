import type { Request, Response } from 'express';
import { loginSchema } from './auth.schema.js';
import { login } from './auth.service.js';

export async function loginHandler(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await login(input);
  res.json(result);
}
