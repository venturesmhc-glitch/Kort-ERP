export type DiaSemana = 'LUN' | 'MAR' | 'MIE' | 'JUE' | 'VIE' | 'SAB' | 'DOM';

export const DIAS_SEMANA: DiaSemana[] = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];

export const DIA_LABELS: Record<DiaSemana, string> = {
  LUN: 'Lunes',
  MAR: 'Martes',
  MIE: 'Miercoles',
  JUE: 'Jueves',
  VIE: 'Viernes',
  SAB: 'Sabado',
  DOM: 'Domingo',
};

export interface Horario {
  id: string;
  barberoId: string;
  barberoNombre: string;
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  slotMinutos: number;
}

export type HorarioInput = Omit<Horario, 'id'>;

export type TurnoEstado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

export const TURNO_ESTADO_LABELS: Record<TurnoEstado, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export interface Turno {
  id: string;
  codigo: string;
  clienteNombre: string;
  clienteApellido: string;
  clienteTelefono: string;
  clienteEmail?: string;
  barberoId: string;
  barberoNombre: string;
  fecha: string;
  hora: string;
  tipoCorteId: string;
  tipoCorteNombre: string;
  estado: TurnoEstado;
}

export type TurnoInput = Omit<Turno, 'id' | 'codigo' | 'estado'>;
