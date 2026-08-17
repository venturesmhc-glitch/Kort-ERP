import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../utils/errors.js';
import { touchActivity } from '../modules/workshifts/workshifts.service.js';

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

export function verifyToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    throw new UnauthorizedError('Token no provisto');
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role };

    // Fire-and-forget: alimenta WorkSession.lastActivityAt para el cierre por
    // inactividad de Jornadas laborales (ver workshifts.service.ts). No se
    // espera para no sumar latencia a cada request autenticado.
    if (payload.role === 'BARBERO' || payload.role === 'ENCARGADO') {
      touchActivity(payload.sub).catch((error) => {
        console.error('[WorkSessionService] Error actualizando actividad', error);
      });
    }

    next();
  } catch {
    throw new UnauthorizedError('Token invalido o expirado');
  }
}
