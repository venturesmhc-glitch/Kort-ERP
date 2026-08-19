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

// Limiter especifico para login: ventana de 15 min / 10 intentos por IP.
// Mas estricto que publicWriteLimiter porque protege contra fuerza bruta de
// contraseñas, no solo abuso de escritura publica.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos de inicio de sesion, intenta de nuevo mas tarde' },
});
