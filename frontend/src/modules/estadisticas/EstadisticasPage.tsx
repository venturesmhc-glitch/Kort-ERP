import { useEffect, useState } from 'react';
import {
  getBarberStatsRequest,
  getClientStatsRequest,
  getCutStatsRequest,
  getSaleStatsRequest,
  type StatsFiltros,
} from './estadisticas.api';
import type { BarberStat, ClientStats, CutStats, SaleStats } from './estadisticas.types';
import { BarChart } from '../../components/BarChart';
import { formatCurrency, todayIso } from '../../lib/format';

function inicioDeMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDiaCorto(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export function EstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [barberStats, setBarberStats] = useState<BarberStat[]>([]);
  const [cutStats, setCutStats] = useState<CutStats | null>(null);
  const [saleStats, setSaleStats] = useState<SaleStats | null>(null);
  const [filtros, setFiltros] = useState<StatsFiltros>({
    fechaDesde: inicioDeMes(),
    fechaHasta: todayIso(),
  });

  async function load(activeFiltros: StatsFiltros) {
    setLoading(true);
    try {
      const [clients, barbers, cuts, sales] = await Promise.all([
        getClientStatsRequest(activeFiltros),
        getBarberStatsRequest(activeFiltros),
        getCutStatsRequest(activeFiltros),
        getSaleStatsRequest(activeFiltros),
      ]);
      setClientStats(clients);
      setBarberStats(barbers);
      setCutStats(cuts);
      setSaleStats(sales);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !clientStats || !cutStats || !saleStats) {
    return <p>Cargando...</p>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Centro de estadisticas</h1>
      </div>

      <div className="client-form" style={{ marginBottom: '1rem' }}>
        <label htmlFor="fechaDesde">Desde</label>
        <input
          id="fechaDesde"
          type="date"
          value={filtros.fechaDesde ?? ''}
          onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value || undefined }))}
        />
        <label htmlFor="fechaHasta">Hasta</label>
        <input
          id="fechaHasta"
          type="date"
          value={filtros.fechaHasta ?? ''}
          onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value || undefined }))}
        />
        <button type="button" onClick={() => load(filtros)}>
          Filtrar
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Altas de clientes</span>
          <span className="stat-value">{clientStats.totalAltas}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Cortes registrados</span>
          <span className="stat-value">{cutStats.totalCortes}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Ventas totales</span>
          <span className="stat-value">{formatCurrency(saleStats.totalVentas)}</span>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h2>Altas de clientes por dia</h2>
          {clientStats.altasPorDia.length > 0 ? (
            <BarChart
              data={clientStats.altasPorDia.map((d) => ({ label: formatDiaCorto(d.date), value: d.count }))}
            />
          ) : (
            <p className="text-muted">No hay altas en el periodo.</p>
          )}
        </div>

        <div className="card">
          <h2>Clientes nuevos vs. recurrentes</h2>
          <p className="text-muted">Entre los clientes con al menos un corte en el periodo.</p>
          <BarChart
            data={[
              { label: 'Nuevos', value: clientStats.nuevosVsRecurrentes.nuevos },
              { label: 'Recurrentes', value: clientStats.nuevosVsRecurrentes.recurrentes },
            ]}
            color="var(--color-accent)"
          />
        </div>

        <div className="card">
          <h2>Cortes por tipo</h2>
          {cutStats.porTipo.length > 0 ? (
            <BarChart
              data={cutStats.porTipo.map((t) => ({ label: t.tipoCorteNombre, value: t.cantidad }))}
            />
          ) : (
            <p className="text-muted">Todavia no hay cortes registrados.</p>
          )}
        </div>

        <div className="card">
          <h2>Evolucion de cortes</h2>
          {cutStats.evolucion.length > 0 ? (
            <BarChart
              data={cutStats.evolucion.map((e) => ({ label: formatDiaCorto(e.date), value: e.cantidad }))}
              color="var(--color-accent)"
            />
          ) : (
            <p className="text-muted">Todavia no hay cortes registrados.</p>
          )}
        </div>

        <div className="card">
          <h2>Ventas por articulo</h2>
          {saleStats.porArticulo.length > 0 ? (
            <BarChart
              data={saleStats.porArticulo.map((a) => ({ label: a.articleNombre, value: a.total }))}
              color="var(--color-accent)"
              formatValue={formatCurrency}
            />
          ) : (
            <p className="text-muted">Todavia no hay ventas registradas.</p>
          )}
        </div>

        <div className="card">
          <h2>Ventas por categoria de producto</h2>
          {saleStats.porCategoria.length > 0 ? (
            <BarChart
              data={saleStats.porCategoria.map((c) => ({ label: c.categoriaNombre, value: c.total }))}
              formatValue={formatCurrency}
            />
          ) : (
            <p className="text-muted">Todavia no hay ventas registradas.</p>
          )}
        </div>

        <div className="card">
          <h2>Ventas por dia</h2>
          {saleStats.serieDiaria.length > 0 ? (
            <BarChart
              data={saleStats.serieDiaria.map((s) => ({ label: formatDiaCorto(s.date), value: s.total }))}
              color="var(--color-accent)"
              formatValue={formatCurrency}
            />
          ) : (
            <p className="text-muted">Todavia no hay ventas registradas.</p>
          )}
        </div>
      </div>

      <h2>Barberos</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Barbero</th>
              <th>Cortes realizados</th>
              <th>Ventas generadas</th>
              <th>Horas trabajadas</th>
            </tr>
          </thead>
          <tbody>
            {barberStats.map((b) => (
              <tr key={b.barberoId}>
                <td>{b.barberoNombre}</td>
                <td>{b.cortesRealizados}</td>
                <td>{formatCurrency(b.ventasGeneradas)}</td>
                <td>{b.horasTrabajadas.toFixed(1)} hs</td>
              </tr>
            ))}
            {barberStats.length === 0 && (
              <tr>
                <td colSpan={4}>No hay actividad de barberos en el periodo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
