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
