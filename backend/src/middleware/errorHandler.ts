import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ message: 'Datos invalidos', issues: err.issues });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  // Red de seguridad para errores de integridad referencial no manejados
  // explicitamente en el service: evita devolver siempre un 500 generico
  // cuando la causa real es un conflicto de datos (FK, registro inexistente, etc).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2003' || err.code === 'P2014') {
      res.status(409).json({
        message:
          'No se puede completar la operacion: el registro tiene datos relacionados (turnos, cortes, ventas u otros) que lo referencian.',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ message: 'Recurso no encontrado' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ message: 'Ya existe un registro con esos datos' });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ message: 'Error interno del servidor' });
}
