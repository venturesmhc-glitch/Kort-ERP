import { createMockCollection } from '../../lib/mockStore';
import type { DiaSemana, Horario, HorarioInput, Turno, TurnoEstado, TurnoInput } from './turnos.types';

const horarioSeed: Horario[] = [
  {
    id: 'horario-lucas-lun',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    dia: 'LUN',
    horaInicio: '09:00',
    horaFin: '18:00',
    slotMinutos: 30,
  },
  {
    id: 'horario-lucas-mar',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    dia: 'MAR',
    horaInicio: '09:00',
    horaFin: '18:00',
    slotMinutos: 30,
  },
  {
    id: 'horario-lucas-mie',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    dia: 'MIE',
    horaInicio: '09:00',
    horaFin: '18:00',
    slotMinutos: 30,
  },
  {
    id: 'horario-nahuel-jue',
    barberoId: 'seed-barbero-2',
    barberoNombre: 'Nahuel Ibarra',
    dia: 'JUE',
    horaInicio: '10:00',
    horaFin: '19:00',
    slotMinutos: 30,
  },
  {
    id: 'horario-nahuel-vie',
    barberoId: 'seed-barbero-2',
    barberoNombre: 'Nahuel Ibarra',
    dia: 'VIE',
    horaInicio: '10:00',
    horaFin: '19:00',
    slotMinutos: 30,
  },
  {
    id: 'horario-nahuel-sab',
    barberoId: 'seed-barbero-2',
    barberoNombre: 'Nahuel Ibarra',
    dia: 'SAB',
    horaInicio: '09:00',
    horaFin: '14:00',
    slotMinutos: 30,
  },
];

const turnoSeed: Turno[] = [];

const horariosCollection = createMockCollection<Horario>('horarios', horarioSeed);
const turnosCollection = createMockCollection<Turno>('turnos', turnoSeed);

export const listHorariosRequest = () => horariosCollection.list();
export const createHorarioRequest = (input: HorarioInput) => horariosCollection.create(input);
export const updateHorarioRequest = (id: string, input: HorarioInput) =>
  horariosCollection.update(id, input);
export const deleteHorarioRequest = (id: string) => horariosCollection.remove(id);

export const listTurnosRequest = () => turnosCollection.list();
export const updateTurnoEstadoRequest = (id: string, estado: TurnoEstado) =>
  turnosCollection.update(id, { estado });
export const deleteTurnoRequest = (id: string) => turnosCollection.remove(id);

const DIAS_POR_INDICE: DiaSemana[] = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'];

function diaFromFecha(fecha: string): DiaSemana {
  const date = new Date(`${fecha}T00:00:00`);
  return DIAS_POR_INDICE[date.getDay()];
}

function generarSlots(horaInicio: string, horaFin: string, slotMinutos: number): string[] {
  const slots: string[] = [];
  const [hInicio, mInicio] = horaInicio.split(':').map(Number);
  const [hFin, mFin] = horaFin.split(':').map(Number);
  let current = hInicio * 60 + mInicio;
  const end = hFin * 60 + mFin;
  while (current < end) {
    const hh = Math.floor(current / 60).toString().padStart(2, '0');
    const mm = (current % 60).toString().padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    current += slotMinutos;
  }
  return slots;
}

export async function listSlotsDisponiblesRequest(barberoId: string, fecha: string): Promise<string[]> {
  const horarios = await horariosCollection.list();
  const dia = diaFromFecha(fecha);
  const horario = horarios.find((h) => h.barberoId === barberoId && h.dia === dia);
  if (!horario) return [];

  const slots = generarSlots(horario.horaInicio, horario.horaFin, horario.slotMinutos);
  const turnos = await turnosCollection.list();
  const ocupados = new Set(
    turnos
      .filter((t) => t.barberoId === barberoId && t.fecha === fecha && t.estado !== 'cancelado')
      .map((t) => t.hora)
  );
  return slots.filter((slot) => !ocupados.has(slot));
}

export async function crearTurnoRequest(input: TurnoInput): Promise<Turno> {
  const codigo = crypto.randomUUID().slice(0, 8).toUpperCase();
  return turnosCollection.create({ ...input, codigo, estado: 'pendiente' });
}
