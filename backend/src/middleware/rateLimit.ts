import rateLimit from 'express-rate-limit';

// Limiter por IP para endpoints publicos sensibles a abuso (creacion de turno,
// checkout de merch). Ventana de 15 min / 20 requests: cubre un uso normal
// (varios intentos de reserva/compra desde el mismo local, wifi compartida,
// reintentos por error de red) sin dejar la puerta abierta a spam masivo.
export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes, intenta de nuevo mas tarde' },
});

// Limiter por IP especifico para POST /api/auth/login (auditoria de
// seguridad: el endpoint no tenia ningun limite, quedaba abierto a
// bruteforce/credential stuffing). Ventana de 15 min / 10 intentos: mas
// estricto que publicWriteLimiter porque login es el endpoint mas sensible
// del sistema. skipSuccessfulRequests evita penalizar a un usuario legitimo
// que ya inicio sesion correctamente dentro de la ventana.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos de inicio de sesion, intenta de nuevo mas tarde' },
});
