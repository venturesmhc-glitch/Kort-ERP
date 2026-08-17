import { useEffect, useState } from 'react';
import { listCortesRequest } from '../cortes/cortes.api';
import { listVentasRequest } from '../ventas/ventas.api';
import { listClientsRequest } from '../clients/clients.api';
import { listMovimientosRequest } from '../tesoreria/tesoreria.api';
import { BarChart } from '../../components/BarChart';
import { formatCurrency } from '../../lib/format';

interface Datum {
  label: string;
  value: number;
}

export function EstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [cortesPorBarbero, setCortesPorBarbero] = useState<Datum[]>([]);
  const [ventasPorArticulo, setVentasPorArticulo] = useState<Datum[]>([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalCortes, setTotalCortes] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);

  useEffect(() => {
    // Cada fuente se resuelve por separado: si el backend real de Clientes
    // todavia no esta levantado, las estadisticas basadas en datos mock
    // (cortes, ventas, tesoreria) igual se muestran.
    async function load() {
      const [cortes, ventas, movimientos] = await Promise.all([
        listCortesRequest(),
        listVentasRequest(),
        listMovimientosRequest(),
      ]);

      const cortesMap = new Map<string, number>();
      cortes.forEach((c) => cortesMap.set(c.barberoNombre, (cortesMap.get(c.barberoNombre) ?? 0) + 1));
      setCortesPorBarbero([...cortesMap.entries()].map(([label, value]) => ({ label, value })));

      const ventasMap = new Map<string, number>();
      ventas.forEach((v) =>
        ventasMap.set(v.articuloNombre, (ventasMap.get(v.articuloNombre) ?? 0) + v.total)
      );
      setVentasPorArticulo([...ventasMap.entries()].map(([label, value]) => ({ label, value })));

      setTotalCortes(cortes.length);
      setTotalVentas(ventas.length);
      setTotalIngresos(
        movimientos.filter((m) => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      );
      setLoading(false);
    }
    load();

    listClientsRequest()
      .then((clients) => setTotalClientes(clients.length))
      .catch(() => setTotalClientes(0));
  }, []);

  if (loading) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Centro de estadisticas</h1>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Clientes</span>
          <span className="stat-value">{totalClientes}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Cortes registrados</span>
          <span className="stat-value">{totalCortes}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Ventas registradas</span>
          <span className="stat-value">{totalVentas}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Ingresos totales</span>
          <span className="stat-value">{formatCurrency(totalIngresos)}</span>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Cortes por barbero</h2>
          {cortesPorBarbero.length > 0 ? (
            <BarChart data={cortesPorBarbero} />
          ) : (
            <p className="text-muted">Todavia no hay cortes registrados.</p>
          )}
        </div>
        <div className="card">
          <h2>Ventas por articulo</h2>
          {ventasPorArticulo.length > 0 ? (
            <BarChart data={ventasPorArticulo} color="var(--color-accent)" formatValue={formatCurrency} />
          ) : (
            <p className="text-muted">Todavia no hay ventas registradas.</p>
          )}
        </div>
      </div>
    </div>
  );
}
