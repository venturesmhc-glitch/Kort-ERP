export interface ClientStats {
  from: string;
  to: string;
  totalAltas: number;
  altasPorDia: { date: string; count: number }[];
  nuevosVsRecurrentes: { nuevos: number; recurrentes: number };
}

export interface BarberStat {
  barberoId: string;
  barberoNombre: string;
  cortesRealizados: number;
  ventasGeneradas: number;
  horasTrabajadas: number;
}

export interface CutStats {
  from: string;
  to: string;
  totalCortes: number;
  porTipo: { tipoCorteId: string; tipoCorteNombre: string; cantidad: number }[];
  evolucion: { date: string; cantidad: number }[];
}

export interface SaleStats {
  from: string;
  to: string;
  totalVentas: number;
  serieDiaria: { date: string; total: number }[];
  porArticulo: { articleId: string; articleNombre: string; cantidad: number; total: number }[];
  porCategoria: { categoriaId: string; categoriaNombre: string; total: number }[];
}
