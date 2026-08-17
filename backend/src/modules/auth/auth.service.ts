import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { WorkSessionService } from '../workshifts/workshifts.service.js';
import type { LoginInput } from './auth.schema.js';

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.active) {
    throw new UnauthorizedError('Credenciales invalidas');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedError('Credenciales invalidas');
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);

  // Jornadas laborales solo trackea Barbero/Encargado (ver skills.md #4):
  // Dev es una cuenta tecnica sin horario/dias de trabajo configurados.
  if (user.role === 'BARBERO' || user.role === 'ENCARGADO') {
    await WorkSessionService.closeStaleSessionsIfAny(user.id);
    await WorkSessionService.createSession(user.id);
  }

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  };
}

export async function logout(userId: string) {
  await WorkSessionService.closeSession(userId, 'MANUAL');
}
