import { z } from 'zod';

// Compartido por los listados operativos que crecen sin limite (clientes,
// turnos, cortes, ventas - ver docs/auditoria-2026-08-19.md #2.5). Los
// catalogos chicos y de tamano acotado (Articulos, Parametrizados) quedan
// afuera a proposito: Articulos ademas se sirve sin auth para el catalogo
// publico de la tienda, que necesita la lista completa.
// pageSize default alto a proposito: hoy ningun listado tiene UI de
// paginacion (ver docs/auditoria-2026-08-19.md #2.5), asi que un default bajo
// truncaria en silencio pantallas que hoy asumen "la lista completa" (ej.
// ClientsPage, o useTodaySummary filtrando cortes/ventas de hoy sobre el
// listado entero). 200 cubre holgadamente el volumen de una sola barberia
// por bastante tiempo; el cap de 500 sigue evitando un query realmente
// ilimitado. Cuando se sume UI de paginacion real, estos valores se pueden
// bajar sin tocar el resto del contrato.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(500).default(200),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginationSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function toPaginated<T>(items: T[], total: number, query: PaginationQuery): Paginated<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}
