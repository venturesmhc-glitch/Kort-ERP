import { apiRequest } from '../../lib/apiClient';
import type { Corte } from './cortes.types';
import type { CorteFormValues } from './cortes.schema';

interface CutDto {
  id: string;
  price: number;
  photoUrl: string | null;
  cutAt: string;
  appointmentId: string | null;
  client: { firstName: string; lastName: string; phone: string };
  barberoId: string;
  barbero: { firstName: string; lastName: string };
  tipoCorteId: string;
  tipoCorte: { name: string };
}

// cutAt viaja como instante UTC; se muestra como fecha calendario local.
function toLocalDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function toCorte(dto: CutDto): Corte {
  return {
    id: dto.id,
    clienteNombre: dto.client.firstName,
    clienteApellido: dto.client.lastName,
    clienteTelefono: dto.client.phone,
    barberoId: dto.barberoId,
    barberoNombre: `${dto.barbero.firstName} ${dto.barbero.lastName}`,
    tipoCorteId: dto.tipoCorteId,
    tipoCorteNombre: dto.tipoCorte.name,
    precio: dto.price,
    fecha: toLocalDate(dto.cutAt),
    imagenUrl: dto.photoUrl ?? undefined,
    appointmentId: dto.appointmentId ?? undefined,
  };
}

export async function listCortesRequest(): Promise<Corte[]> {
  const dtos = await apiRequest<CutDto[]>('/cuts');
  return dtos.map(toCorte);
}

export function deleteCorteRequest(id: string): Promise<void> {
  return apiRequest<void>(`/cuts/${id}`, { method: 'DELETE' });
}

export async function crearCorteRequest(
  input: CorteFormValues
): Promise<Corte & { treasuryWarning?: string }> {
  const dto = await apiRequest<CutDto & { treasuryWarning?: string }>('/cuts', {
    method: 'POST',
    body: {
      firstName: input.clienteNombre,
      lastName: input.clienteApellido,
      phone: input.clienteTelefono,
      barberoId: input.barberoId,
      tipoCorteId: input.tipoCorteId,
      price: input.precio,
      photoUrl: input.imagenUrl || undefined,
      appointmentId: input.appointmentId || undefined,
      cutAt: input.fecha,
    },
  });
  return { ...toCorte(dto), treasuryWarning: dto.treasuryWarning };
}
