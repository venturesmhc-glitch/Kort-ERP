import { createMockCollection } from '../../lib/mockStore';
import type { Jornada } from './jornadas.types';
import { toLocalIso } from '../../lib/format';

function fechaHaceDias(dias: number): string {
  const date = new Date();
  date.setDate(date.getDate() - dias);
  return toLocalIso(date);
}

const seed: Jornada[] = [
  {
    id: 'jornada-1',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    fecha: fechaHaceDias(3),
    horaEntrada: '09:02',
    horaSalida: '18:10',
    cortesRealizados: 11,
  },
  {
    id: 'jornada-2',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    fecha: fechaHaceDias(2),
    horaEntrada: '08:58',
    horaSalida: '17:45',
    cortesRealizados: 9,
  },
  {
    id: 'jornada-3',
    barberoId: 'seed-barbero-1',
    barberoNombre: 'Lucas Ferreyra',
    fecha: fechaHaceDias(1),
    horaEntrada: '09:05',
    horaSalida: '18:00',
    cortesRealizados: 10,
  },
  {
    id: 'jornada-4',
    barberoId: 'seed-barbero-2',
    barberoNombre: 'Nahuel Ibarra',
    fecha: fechaHaceDias(2),
    horaEntrada: '10:00',
    horaSalida: '19:05',
    cortesRealizados: 8,
  },
  {
    id: 'jornada-5',
    barberoId: 'seed-barbero-2',
    barberoNombre: 'Nahuel Ibarra',
    fecha: fechaHaceDias(1),
    horaEntrada: '09:55',
    horaSalida: '19:00',
    cortesRealizados: 12,
  },
];

const collection = createMockCollection<Jornada>('jornadas', seed);

export const listJornadasRequest = () => collection.list();
