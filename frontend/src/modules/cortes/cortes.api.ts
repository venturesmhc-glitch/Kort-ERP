import { createMockCollection } from '../../lib/mockStore';
import type { Corte } from './cortes.types';
import type { CorteFormValues } from './cortes.schema';
import { registrarIngresoCorteRequest } from '../tesoreria/tesoreria.api';

const collection = createMockCollection<Corte>('cortes', []);

export const listCortesRequest = () => collection.list();
export const deleteCorteRequest = (id: string) => collection.remove(id);

export async function crearCorteRequest(input: CorteFormValues): Promise<Corte> {
  const corte = await collection.create({ ...input, fecha: input.fecha });
  await registrarIngresoCorteRequest(input.precio, `Corte a ${input.clienteNombre}`);
  return corte;
}
