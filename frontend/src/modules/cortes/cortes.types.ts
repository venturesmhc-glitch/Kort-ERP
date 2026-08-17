export interface Corte {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  barberoId: string;
  barberoNombre: string;
  tipoCorteId: string;
  tipoCorteNombre: string;
  precio: number;
  fecha: string;
  imagenUrl?: string;
}

export type CorteInput = Omit<Corte, 'id'>;
