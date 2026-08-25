import { useCallback, useEffect, useRef, useState } from 'react';
import { listVentasRequest } from '../ventas/ventas.api';
import { listStockBajoRequest } from '../articulos/articulos.api';
import { listCortesRequest } from '../cortes/cortes.api';
import { todayIso } from '../../lib/format';

const TODAY = todayIso();

export interface TodaySummary {
  loading: boolean;
  totalVentas: number;
  ventasCount: number;
  stockBajoCount: number;
  cortesEquipo: { nombre: string; cantidad: number }[];
  // Reconsulta en segundo plano (ej. al completar un turno desde la Agenda,
  // que genera un Corte/ingreso de Tesoreria) sin tocar `loading` - a
  // diferencia del efecto inicial, no se quiere tapar la columna lateral con
  // skeletons por una actualizacion que deberia sentirse instantanea.
  refresh: () => void;
}

/** Resumen de hoy (ventas, stock bajo, cortes por barbero) compartido entre
 * el Dashboard y la columna lateral de la Agenda. */
export function useTodaySummary(canSeeVentas: boolean, canSeeStock: boolean): TodaySummary {
  const [loading, setLoading] = useState(true);
  const [totalVentas, setTotalVentas] = useState(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [cortesEquipo, setCortesEquipo] = useState<{ nombre: string; cantidad: number }[]>([]);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const [ventas, stockBajo, cortes] = await Promise.all([
        canSeeVentas ? listVentasRequest({ fechaDesde: TODAY, fechaHasta: TODAY }) : Promise.resolve([]),
        canSeeStock ? listStockBajoRequest() : Promise.resolve([]),
        listCortesRequest(),
      ]);
      if (cancelledRef.current) return;
      setTotalVentas(ventas.reduce((sum, v) => sum + v.total, 0));
      setVentasCount(ventas.length);
      setStockBajoCount(stockBajo.length);

      const cortesHoy = cortes.filter((c) => c.fecha === TODAY);
      const porBarbero = new Map<string, number>();
      cortesHoy.forEach((c) => porBarbero.set(c.barberoNombre, (porBarbero.get(c.barberoNombre) ?? 0) + 1));
      setCortesEquipo([...porBarbero.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })));
    } catch {
      // Best-effort: la columna lateral no bloquea el resto de la pagina.
    }
  }, [canSeeVentas, canSeeStock]);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    load().finally(() => {
      if (!cancelledRef.current) setLoading(false);
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  return { loading, totalVentas, ventasCount, stockBajoCount, cortesEquipo, refresh: load };
}
