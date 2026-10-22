import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prismaUnscoped } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { runWithTenant } from '../../lib/tenantContext.js';
import { WorkSessionService } from '../workshifts/workshifts.service.js';
import type { LoginInput } from './auth.schema.js';
import { clearFailedAttempts, isLockedOut, registerFailedAttempt } from './loginAttempts.js';

export async function login({ email, password }: LoginInput) {
  if (isLockedOut(email)) {
    throw new UnauthorizedError(
      'Cuenta bloqueada temporalmente por demasiados intentos fallidos. Intenta de nuevo en unos minutos.'
    );
  }

  // Login corre ANTES de tener un tenant resuelto (es justo lo que esta
  // query resuelve), asi que usa el cliente sin scoping y busca por email
  // en toda la plataforma. User.email sigue siendo unico a nivel global
  // (no por tenant) a proposito: asi el login no necesita que el usuario
  // elija su barberia, el backend ya sabe a cual pertenece.
  const user = await prismaUnscoped.user.findUnique({
    where: { email },
    include: { tenant: { select: { slug: true } } },
  });

  if (!user || !user.active) {
    registerFailedAttempt(email);
    console.warn(`[auth] login fallido (usuario inexistente o inactivo): email=${email}`);
    throw new UnauthorizedError('Credenciales invalidas');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    registerFailedAttempt(email);
    console.warn(`[auth] login fallido (contrasena incorrecta): userId=${user.id}`);
    throw new UnauthorizedError('Credenciales invalidas');
  }

  clearFailedAttempts(email);

  const token = jwt.sign({ sub: user.id, role: user.role, tenantId: user.tenantId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as SignOptions);

  // Jornadas laborales solo trackea Barbero/Encargado (ver skills.md #4):
  // Dev es una cuenta tecnica sin horario/dias de trabajo configurados.
  if (user.role === 'BARBERO' || user.role === 'ENCARGADO') {
    await runWithTenant(user.tenantId, async () => {
      await WorkSessionService.closeStaleSessionsIfAny(user.id);
      await WorkSessionService.createSession(user.id);
    });
  }

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantSlug: user.tenant.slug,
    },
  };
}

export async function logout(userId: string) {
  await WorkSessionService.closeSession(userId, 'MANUAL');
}
