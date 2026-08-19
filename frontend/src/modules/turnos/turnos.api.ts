import { apiRequest } from '../../lib/apiClient';
import type {
  AppointmentSettings,
  DiaSemana,
  Horario,
  HorarioInput,
  Turno,
  TurnoEstado,
  TurnoInput,
} from './turnos.types';

const DIA_TO_BACKEND: Record<DiaSemana, string> = {
  LUN: 'MON',
  MAR: 'TUE',
  MIE: 'WED',
  JUE: 'THU',
  VIE: 'FRI',
  SAB: 'SAT',
  DOM: 'SUN',
};

const DIA_FROM_BACKEND: Record<string, DiaSemana> = {
  MON: 'LUN',
  TUE: 'MAR',
  WED: 'MIE',
  THU: 'JUE',
  FRI: 'VIE',
  SAT: 'SAB',
  SUN: 'DOM',
};

const ESTADO_TO_BACKEND: Record<TurnoEstado, string> = {
  pendiente: 'PENDING',
  confirmado: 'CONFIRMED',
  cancelado: 'CANCELLED',
  completado: 'COMPLETED',
};

const ESTADO_FROM_BACKEND: Record<string, TurnoEstado> = {
  PENDING: 'pendiente',
  CONFIRMED: 'confirmado',
  CANCELLED: 'cancelado',
  COMPLETED: 'completado',
};

interface WorkScheduleDto {
  id: string;
  barberoId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  barbero: { id: string; firstName: string; lastName: string };
}

interface AppointmentDto {
  id: string;
  code: string;
  scheduledAt: string;
  status: string;
  client: { firstName: string; lastName: string; phone: string; email: string | null };
  barberoId: string;
  barbero: { firstName: string; lastName: string };
  tipoCorteId: string;
  tipoCorte: { name: string };
}

function toHorario(dto: WorkScheduleDto): Horario {
  return {
    id: dto.id,
    barberoId: dto.barberoId,
    barberoNombre: `${dto.barbero.firstName} ${dto.barbero.lastName}`,
    dia: DIA_FROM_BACKEND[dto.dayOfWeek] ?? 'LUN',
    horaInicio: dto.startTime,
    horaFin: dto.endTime,
  };
}

// scheduledAt viaja como instante UTC; se muestra en el horario local del
// navegador, que para esta app coincide con el de la barberia.
function splitScheduledAt(iso: string): { fecha: string; hora: string } {
  const date = new Date(iso);
  const fecha = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
  const hora = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return { fecha, hora };
}

function toTurno(dto: AppointmentDto): Turno {
  const { fecha, hora } = splitScheduledAt(dto.scheduledAt);
  return {
    id: dto.id,
    codigo: dto.code,
    clienteNombre: dto.client.firstName,
    clienteApellido: dto.client.lastName,
    clienteTelefono: dto.client.phone,
    clienteEmail: dto.client.email ?? undefined,
    barberoId: dto.barberoId,
    barberoNombre: `${dto.barbero.firstName} ${dto.barbero.lastName}`,
    fecha,
    hora,
    tipoCorteId: dto.tipoCorteId,
    tipoCorteNombre: dto.tipoCorte.name,
    estado: ESTADO_FROM_BACKEND[dto.status] ?? 'pendiente',
  };
}

// --- Horarios de atencion (panel admin, autenticado) ---

export async function listHorariosRequest(): Promise<Horario[]> {
  const dtos = await apiRequest<WorkScheduleDto[]>('/appointments/schedules');
  return dtos.map(toHorario);
}

export async function createHorarioRequest(input: HorarioInput): Promise<Horario> {
  const dto = await apiRequest<WorkScheduleDto>('/appointments/schedules', {
    method: 'POST',
    body: {
      barberoId: input.barberoId,
      dayOfWeek: DIA_TO_BACKEND[input.dia],
      startTime: input.horaInicio,
      endTime: input.horaFin,
    },
  });
  return toHorario(dto);
}

export async function updateHorarioRequest(id: string, input: HorarioInput): Promise<Horario> {
  const dto = await apiRequest<WorkScheduleDto>(`/appointments/schedules/${id}`, {
    method: 'PUT',
    body: {
      dayOfWeek: DIA_TO_BACKEND[input.dia],
      startTime: input.horaInicio,
      endTime: input.horaFin,
    },
  });
  return toHorario(dto);
}

export function deleteHorarioRequest(id: string): Promise<void> {
  return apiRequest<void>(`/appointments/schedules/${id}`, { method: 'DELETE' });
}

export function getAppointmentSettingsRequest(): Promise<AppointmentSettings> {
  return apiRequest<{ slotMinutes: number }>('/appointments/settings').then((dto) => ({
    slotMinutos: dto.slotMinutes,
  }));
}

export function updateAppointmentSettingsRequest(slotMinutos: number): Promise<AppointmentSettings> {
  return apiRequest<{ slotMinutes: number }>('/appointments/settings', {
    method: 'PUT',
    body: { slotMinutes: slotMinutos },
  }).then((dto) => ({ slotMinutos: dto.slotMinutes }));
}

// --- Agenda (panel admin, autenticado; Barbero ve solo la propia) ---

export async function listTurnosRequest(): Promise<Turno[]> {
  const dtos = await apiRequest<AppointmentDto[]>('/appointments');
  return dtos.map(toTurno);
}

export async function updateTurnoEstadoRequest(id: string, estado: TurnoEstado): Promise<Turno> {
  const dto = await apiRequest<AppointmentDto>(`/appointments/${id}/status`, {
    method: 'PUT',
    body: { status: ESTADO_TO_BACKEND[estado] },
  });
  return toTurno(dto);
}

// --- Wizard publico (sin auth) ---

export async function listSlotsDisponiblesRequest(barberoId: string, fecha: string): Promise<string[]> {
  if (!barberoId || !fecha) return [];
  return apiRequest<string[]>(
    `/public/appointments/availability?barberoId=${encodeURIComponent(barberoId)}&date=${encodeURIComponent(fecha)}`,
    { auth: false }
  );
}

export async function crearTurnoRequest(
  input: TurnoInput
): Promise<Turno & { discountApplied?: { corte: boolean; merch: boolean } }> {
  const dto = await apiRequest<AppointmentDto & { discountApplied?: { corte: boolean; merch: boolean } }>(
    '/public/appointments',
    {
      method: 'POST',
      auth: false,
      body: {
        firstName: input.clienteNombre,
        lastName: input.clienteApellido,
        phone: input.clienteTelefono,
        email: input.clienteEmail || undefined,
        barberoId: input.barberoId,
        tipoCorteId: input.tipoCorteId,
        date: input.fecha,
        time: input.hora,
        merchSaleId: input.merchSaleId,
        discountCode: input.discountCode,
      },
    }
  );
  return { ...toTurno(dto), discountApplied: dto.discountApplied };
}
