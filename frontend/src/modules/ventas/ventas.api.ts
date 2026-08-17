import { createMockCollection } from '../../lib/mockStore';
import type { Venta } from './ventas.types';
import type { VentaFormValues } from './ventas.schema';
import { adjustStockRequest } from '../articulos/articulos.api';
import { registrarIngresoVentaRequest } from '../tesoreria/tesoreria.api';
import { todayIso } from '../../lib/format';

const collection = createMockCollection<Venta>('ventas', []);

export const listVentasRequest = () => collection.list();

export async function crearVentaRequest(input: VentaFormValues): Promise<Venta> {
  const total = input.cantidad * input.precioUnitario;
  await adjustStockRequest(input.articuloId, -input.cantidad);
  const venta = await collection.create({
    articuloId: input.articuloId,
    articuloNombre: input.articuloNombre,
    cantidad: input.cantidad,
    precioUnitario: input.precioUnitario,
    total,
    fecha: todayIso(),
  });
  await registrarIngresoVentaRequest(total, `Venta de ${input.cantidad} x ${input.articuloNombre}`);
  return venta;
}
