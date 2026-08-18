import type { NextFunction, Request, Response } from 'express';
import type { Plan } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getOrganizationSettings } from '../modules/settings/settings.service.js';

// Gating por plan (Proveedores, Ordenes de compra, Reportes). A diferencia
// de authorize() no depende del rol del usuario: Barbero tiene el mismo
// acceso que Dev/Encargado a estas funcionalidades si el plan las incluye
// (decision del negocio). Es async porque el plan vive en una fila de DB,
// no en el JWT (asi el cambio de plan hecho por Dev aplica sin relogin).
export function requirePlan(...allowedPlans: Plan[]) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }

    const settings = await getOrganizationSettings();
    if (!allowedPlans.includes(settings.plan)) {
      throw new ForbiddenError('Esta funcionalidad requiere el Plan Integral');
    }

    next();
  });
}
