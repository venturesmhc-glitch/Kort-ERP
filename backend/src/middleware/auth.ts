import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { assertSessionActive } from '../modules/workshifts/workshifts.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { runWithTenant } from '../lib/tenantContext.js';

export interface AuthUser {
  id: string;
  role: Role;
  tenantId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
  tenantId: string;
}

export const verifyToken = asyncHandler(async (req: Request, _res: Response, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    throw new UnauthorizedError('Token no provisto');
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    throw new UnauthorizedError('Token invalido o expirado');
  }

  if (!payload.tenantId) {
    // Token emitido antes de multi-tenancy (sin tenantId): se trata como
    // invalido en vez de asumir un tenant por defecto, para no mezclar datos.
    throw new UnauthorizedError('Token invalido o expirado');
  }

  req.user = { id: payload.sub, role: payload.role, tenantId: payload.tenantId };

  // Todo lo que sigue (incluido el resto de este middleware) corre dentro
  // del contexto de tenant: a partir de aca cualquier query Prisma sobre un
  // modelo tenant-scoped (ver lib/prisma.ts) queda automaticamente acotada
  // a este tenant.
  await runWithTenant(payload.tenantId, async () => {
    // Se espera (a diferencia del fire-and-forget anterior) porque ahora decide
    // si el request sigue: cierre de sesion por 2hs de inactividad (skills.md
    // #4) a nivel de autenticacion real, no solo de reporte de horas en
    // Jornadas laborales. Costo: una consulta extra por request de
    // Barbero/Encargado.
    if (payload.role === 'BARBERO' || payload.role === 'ENCARGADO') {
      await assertSessionActive(payload.sub);
    }

    next();
  });
});
