import type { NextFunction, Request, Response } from 'express';
import { prismaUnscoped } from '../lib/prisma.js';
import { runWithTenant } from '../lib/tenantContext.js';
import { NotFoundError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Wizard publico de turnos / tienda de merch: no hay JWT, asi que el tenant
// se resuelve por el slug en la URL (ver app.ts, rutas montadas bajo
// /api/public/t/:tenantSlug/...). Usa prismaUnscoped porque Tenant no es un
// modelo tenant-scoped (buscarlo con el cliente scoped fallaria: todavia no
// hay tenant activo en este punto del request, es justo lo que se esta
// resolviendo).
export const resolveTenantFromSlug = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const slug = req.params.tenantSlug;
    const tenant = await prismaUnscoped.tenant.findUnique({ where: { slug } });

    if (!tenant || !tenant.active) {
      throw new NotFoundError('Barberia no encontrada');
    }

    await runWithTenant(tenant.id, async () => {
      next();
    });
  }
);
