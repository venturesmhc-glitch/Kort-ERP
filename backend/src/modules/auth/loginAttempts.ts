// Bloqueo progresivo de cuenta por intentos fallidos de login (auditoria de
// seguridad: complementa a loginLimiter en rateLimit.ts, que limita por IP,
// con un limite por email que tambien frena un ataque distribuido desde
// muchas IPs contra una sola cuenta). Estado en memoria: alcanza porque el
// backend corre una unica instancia en Render (plan free); si se escala
// horizontalmente en el futuro, esto deberia moverse a un store compartido
// (ej. Redis).
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

interface AttemptRecord {
  failedCount: number;
  lockedUntil: number | null;
}

const attemptsByEmail = new Map<string, AttemptRecord>();

export function isLockedOut(email: string): boolean {
  const record = attemptsByEmail.get(email.toLowerCase());
  return !!record?.lockedUntil && record.lockedUntil > Date.now();
}

// Se llama tanto si el email no existe como si la contrasena es incorrecta,
// para no filtrar (via este mecanismo) si una cuenta existe o no.
export function registerFailedAttempt(email: string): void {
  const key = email.toLowerCase();
  const record = attemptsByEmail.get(key) ?? { failedCount: 0, lockedUntil: null };
  record.failedCount += 1;
  if (record.failedCount >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
    record.failedCount = 0;
  }
  attemptsByEmail.set(key, record);
}

export function clearFailedAttempts(email: string): void {
  attemptsByEmail.delete(email.toLowerCase());
}
