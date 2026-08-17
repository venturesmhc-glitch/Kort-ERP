export interface ClienteStepValues {
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
}

export interface TurnoDraft {
  cliente: ClienteStepValues;
  barberoId: string;
  barberoNombre: string;
  fecha: string;
  hora: string;
  tipoCorteId: string;
  tipoCorteNombre: string;
}

export const TURNO_DRAFT_KEY = 'kort-turno-draft';

export function saveTurnoDraft(draft: TurnoDraft) {
  sessionStorage.setItem(TURNO_DRAFT_KEY, JSON.stringify(draft));
}

export function loadTurnoDraft(): TurnoDraft | null {
  const raw = sessionStorage.getItem(TURNO_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TurnoDraft;
  } catch {
    return null;
  }
}

export function clearTurnoDraft() {
  sessionStorage.removeItem(TURNO_DRAFT_KEY);
}
