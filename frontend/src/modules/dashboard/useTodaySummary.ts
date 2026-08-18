import { useEffect, useState } from 'react';
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
}

/** Resumen de hoy (ventas, stock bajo, cortes por barbero) compartido entre
 * el Dashboard y la columna lateral de la Agenda. */
export function useTodaySummary(canSeeVentas: boolean, canSeeStock: boolean): TodaySummary {
  const [loading, setLoading] = useState(true);
  const [totalVentas, setTotalVentas] = useState(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [stockBajoCount, setStockBajoCount] = useState(0);
  const [cortesEquipo, setCortesEquipo] = useState<{ nombre: string; cantidad: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [ventas, stockBajo, cortes] = await Promise.all([
          canSeeVentas ? listVentasRequest({ fechaDesde: TODAY, fechaHasta: TODAY }) : Promise.resolve([]),
          canSeeStock ? listStockBajoRequest() : Promise.resolve([]),
          listCortesRequest(),
        ]);
        if (cancelled) return;
        setTotalVentas(ventas.reduce((sum, v) => sum + v.total, 0));
        setVentasCount(ventas.length);
        setStockBajoCount(stockBajo.length);

        const cortesHoy = cortes.filter((c) => c.fecha === TODAY);
        const porBarbero = new Map<string, number>();
        cortesHoy.forEach((c) => porBarbero.set(c.barberoNombre, (porBarbero.get(c.barberoNombre) ?? 0) + 1));
        setCortesEquipo([...porBarbero.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })));
      } catch {
        // Best-effort: la columna lateral no bloquea el resto de la pagina.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [canSeeVentas, canSeeStock]);

  return { loading, totalVentas, ventasCount, stockBajoCount, cortesEquipo };
}
