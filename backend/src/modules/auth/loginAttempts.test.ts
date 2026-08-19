import { describe, expect, it, vi } from 'vitest';
import { clearFailedAttempts, isLockedOut, registerFailedAttempt } from './loginAttempts.js';

// Cada test usa un email distinto: el estado de intentos vive en un Map a
// nivel de modulo (compartido por instancia del backend, ver comentario en
// loginAttempts.ts), asi que reusar un email entre tests haria que se
// pisaran los contadores entre si.

describe('loginAttempts', () => {
  it('no bloquea un email sin intentos fallidos previos', () => {
    expect(isLockedOut('sin-intentos@kort.local')).toBe(false);
  });

  it('no bloquea por debajo del umbral de intentos fallidos', () => {
    const email = 'cuatro-intentos@kort.local';
    for (let i = 0; i < 4; i += 1) {
      registerFailedAttempt(email);
    }
    expect(isLockedOut(email)).toBe(false);
  });

  it('bloquea al alcanzar el umbral de intentos fallidos (5)', () => {
    const email = 'cinco-intentos@kort.local';
    for (let i = 0; i < 5; i += 1) {
      registerFailedAttempt(email);
    }
    expect(isLockedOut(email)).toBe(true);
  });

  it('registra el bloqueo sin distinguir mayusculas/minusculas en el email', () => {
    const email = 'Mayusculas@Kort.local';
    for (let i = 0; i < 5; i += 1) {
      registerFailedAttempt(email);
    }
    expect(isLockedOut('mayusculas@kort.local')).toBe(true);
  });

  it('clearFailedAttempts levanta el bloqueo (ej. tras un login exitoso)', () => {
    const email = 'se-limpia@kort.local';
    for (let i = 0; i < 5; i += 1) {
      registerFailedAttempt(email);
    }
    expect(isLockedOut(email)).toBe(true);

    clearFailedAttempts(email);
    expect(isLockedOut(email)).toBe(false);
  });

  it('el bloqueo expira despues de la ventana de 15 minutos', () => {
    vi.useFakeTimers();
    try {
      const email = 'expira@kort.local';
      for (let i = 0; i < 5; i += 1) {
        registerFailedAttempt(email);
      }
      expect(isLockedOut(email)).toBe(true);

      vi.advanceTimersByTime(15 * 60 * 1000 + 1);

      expect(isLockedOut(email)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
