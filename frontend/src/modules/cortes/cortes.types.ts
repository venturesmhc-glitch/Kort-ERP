export interface Corte {
  id: string;
  clienteNombre: string;
  clienteApellido: string;
  clienteTelefono: string;
  barberoId: string;
  barberoNombre: string;
  tipoCorteId: string;
  tipoCorteNombre: string;
  precio: number;
  fecha: string;
  appointmentId?: string;
}

export type CorteInput = Omit<Corte, 'id'>;
