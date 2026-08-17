import { createMockCollection } from '../../lib/mockStore';
import type { Movimiento, MovimientoInput } from './tesoreria.types';
import { todayIso } from '../../lib/format';

const seed: Movimiento[] = [
  {
    id: 'seed-1',
    tipo: 'costo_fijo',
    categoriaId: 'costo-alquiler',
    categoriaNombre: 'Alquiler',
    monto: 250000,
    fecha: '2026-08-01',
    descripcion: 'Alquiler del local',
  },
  {
    id: 'seed-2',
    tipo: 'costo_fijo',
    categoriaId: 'costo-sueldos',
    categoriaNombre: 'Sueldos',
    monto: 480000,
    fecha: '2026-08-01',
  },
  {
    id: 'seed-3',
    tipo: 'costo_variable',
    categoriaId: 'costo-insumos',
    categoriaNombre: 'Insumos',
    monto: 35000,
    fecha: '2026-08-05',
  },
  {
    id: 'seed-4',
    tipo: 'ingreso',
    categoriaId: 'ingreso-cortes',
    categoriaNombre: 'Cortes',
    monto: 180000,
    fecha: '2026-08-10',
  },
  {
    id: 'seed-5',
    tipo: 'ingreso',
    categoriaId: 'ingreso-merchandising',
    categoriaNombre: 'Ventas merchandising',
    monto: 42000,
    fecha: '2026-08-12',
  },
];

const collection = createMockCollection<Movimiento>('tesoreria-movimientos', seed);

export const listMovimientosRequest = () => collection.list();
export const createMovimientoRequest = (input: MovimientoInput) => collection.create(input);
export const deleteMovimientoRequest = (id: string) => collection.remove(id);

export async function registrarIngresoVentaRequest(monto: number, descripcion: string) {
  return collection.create({
    tipo: 'ingreso',
    categoriaId: 'ingreso-merchandising',
    categoriaNombre: 'Ventas merchandising',
    monto,
    fecha: todayIso(),
    descripcion,
  });
}

export async function registrarIngresoCorteRequest(monto: number, descripcion: string) {
  return collection.create({
    tipo: 'ingreso',
    categoriaId: 'ingreso-cortes',
    categoriaNombre: 'Cortes',
    monto,
    fecha: todayIso(),
    descripcion,
  });
}
