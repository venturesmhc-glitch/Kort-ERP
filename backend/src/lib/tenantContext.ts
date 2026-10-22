import { AsyncLocalStorage } from 'node:async_hooks';

// Multi-tenancy: el tenant activo de un request vive en AsyncLocalStorage,
// no en una variable global ni en argumentos pasados a mano por cada
// funcion. Lo llena middleware/auth.ts (JWT, panel admin) o
// middleware/resolveTenantFromSlug.ts (wizard publico) al principio de
// cada request, antes de que corra cualquier controller/service. Desde ahi,
// lib/prisma.ts lo lee para inyectar tenantId en cada query (ver
// tenantScopingExtension) y los services lo leen con getTenantId() para
// setearlo a mano en los create/upsert (ver comentario en prisma.ts sobre
// por que los writes no se inyectan solos).
const storage = new AsyncLocalStorage<{ tenantId: string }>();

export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

// Falla fuerte (en vez de devolver undefined) si se llama fuera de un
// request con tenant resuelto: una query tenant-scoped sin tenant activo es
// un bug, no un caso a tolerar en silencio (el riesgo real de este sistema
// es una fuga de datos entre barberias).
export function getTenantId(): string {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error(
      'getTenantId() llamado sin contexto de tenant activo (fuera de un request con auth o slug resuelto)'
    );
  }
  return ctx.tenantId;
}

export function getTenantIdOrNull(): string | null {
  return storage.getStore()?.tenantId ?? null;
}
