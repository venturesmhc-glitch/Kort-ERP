const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Convierte una fecha a "yyyy-mm-dd" usando el calendario local, no UTC.
 * date.toISOString() convierte a UTC y puede correr la fecha un dia segun el
 * huso horario; para turnos/movimientos locales necesitamos el dia calendario
 * tal como lo ve el usuario.
 */
export function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toLocalIso(new Date());
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return iso;
  return dateFormatter.format(date);
}

/** Desplaza una fecha "yyyy-mm-dd" una cantidad de dias (puede ser negativa). */
export function shiftIso(fecha: string, days: number): string {
  const [year, month, day] = fecha.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalIso(date);
}

/** Diferencia en dias entre dos fechas "yyyy-mm-dd" (a - b). */
export function diffDaysIso(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateA.getTime() - dateB.getTime()) / 86400000);
}
