import type { Request, Response } from 'express';
import type { Role } from '@prisma/client';
import * as usersService from './users.service.js';
import { createUserSchema, updateUserSchema } from './users.schema.js';

const VALID_ROLES: Role[] = ['DEV', 'ENCARGADO', 'BARBERO'];

function parseRoleQuery(value: unknown): Role | undefined {
  return typeof value === 'string' && VALID_ROLES.includes(value as Role)
    ? (value as Role)
    : undefined;
}

function parseBooleanQuery(value: unknown): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export async function listUsersHandler(req: Request, res: Response) {
  const users = await usersService.listUsers({
    role: parseRoleQuery(req.query.role),
    active: parseBooleanQuery(req.query.active),
    esBarbero: parseBooleanQuery(req.query.esBarbero),
  });
  res.json(users);
}

export async function listPublicBarberosHandler(_req: Request, res: Response) {
  const barberos = await usersService.listPublicBarberos();
  res.json(barberos);
}

export async function createUserHandler(req: Request, res: Response) {
  const input = createUserSchema.parse(req.body);
  const user = await usersService.createUser(input, req.user!);
  res.status(201).json(user);
}

export async function updateUserHandler(req: Request, res: Response) {
  const input = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(req.params.id, input, req.user!);
  res.json(user);
}

export async function deleteUserHandler(req: Request, res: Response) {
  await usersService.deactivateUser(req.params.id);
  res.status(204).send();
}
