import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { assertSessionActive } from '../modules/workshifts/workshifts.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export interface AuthUser {
  id: string;
  role: Role;
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

  req.user = { id: payload.sub, role: payload.role };

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
