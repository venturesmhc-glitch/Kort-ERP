import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import * as usersService from './users.service.js';

const VALID_ROLES: Role[] = ['DEV', 'ENCARGADO', 'BARBERO'];

function parseRoleQuery(value: unknown): Role | undefined {
  return typeof value === 'string' && VALID_ROLES.includes(value as Role)
    ? (value as Role)
    : undefined;
}

function parseActiveQuery(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export async function listUsersHandler(req: Request, res: Response) {
  const users = await usersService.listUsers({
    role: parseRoleQuery(req.query.role),
    active: parseActiveQuery(req.query.active),
  });
  res.json(users);
}

export async function listPublicBarberosHandler(_req: Request, res: Response) {
  const barberos = await usersService.listPublicBarberos();
  res.json(barberos);
}
