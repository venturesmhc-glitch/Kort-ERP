import { DIAS_SEMANA, type DiaSemana } from './turnos.types';

export function timeToMinutes(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function addMinutes(hora: string, minutes: number): string {
  return minutesToTime(timeToMinutes(hora) + minutes);
}

/** Dia de la semana (LUN..DOM) de una fecha "yyyy-mm-dd", usando el calendario local. */
export function diaSemanaFromIso(fecha: string): DiaSemana {
  const [y, m, d] = fecha.split('-').map(Number);
  const jsDay = new Date(y, m - 1, d).getDay(); // 0 = domingo
  const index = (jsDay + 6) % 7; // 0 = lunes
  return DIAS_SEMANA[index];
}
