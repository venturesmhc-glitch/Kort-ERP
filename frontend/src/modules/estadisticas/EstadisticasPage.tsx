import { useEffect, useState } from 'react';
import {
  getBarberStatsRequest,
  getClientStatsRequest,
  getCutStatsRequest,
  getSaleStatsRequest,
  type StatsFiltros,
} from './estadisticas.api';
import { listVentasRequest } from '../ventas/ventas.api';
import type { BarberStat, ClientStats, CutStats, SaleStats } from './estadisticas.types';
import { BarChart } from '../../components/BarChart';
import { LineChart } from '../../components/LineChart';
import { formatCurrency, diffDaysIso, shiftIso, todayIso } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton, toErrorMessage } from '../../components/AsyncState';

function inicioDeMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDiaCorto(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

const CHART_COLORS = ['var(--chart-color-1)', 'var(--chart-color-2)', 'var(--chart-color-3)', 'var(--chart-color-4)'];

function buildMix(porTipo: CutStats['porTipo'], total: number) {
  if (total === 0) return [];
  const sorted = [...porTipo].sort((a, b) => b.cantidad - a.cantidad);
  const top = sorted.slice(0, 3);
  const restCantidad = sorted.slice(3).reduce((sum, t) => sum + t.cantidad, 0);
  const items = top.map((t) => ({ nombre: t.tipoCorteNombre, cantidad: t.cantidad }));
  if (restCantidad > 0) items.push({ nombre: 'Otros', cantidad: restCantidad });
  return items.map((item, i) => ({
    ...item,
    pct: Math.round((item.cantidad / total) * 100),
    color: CHART_COLORS[i] ?? CHART_COLORS[CHART_COLORS.length - 1],
  }));
}

export function EstadisticasPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [barberStats, setBarberStats] = useState<BarberStat[]>([]);
  const [cutStats, setCutStats] = useState<CutStats | null>(null);
  const [saleStats, setSaleStats] = useState<SaleStats | null>(null);
  const [prevTotalVentas, setPrevTotalVentas] = useState(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [filtros, setFiltros] = useState<StatsFiltros>({
    fechaDesde: inicioDeMes(),
    fechaHasta: todayIso(),
  });

  async function load(activeFiltros: StatsFiltros) {
    setLoading(true);
    setError(null);
    try {
      const desde = activeFiltros.fechaDesde ?? inicioDeMes();
      const hasta = activeFiltros.fechaHasta ?? todayIso();
      const rangeDays = Math.max(1, diffDaysIso(hasta, desde) + 1);
      const prevHasta = shiftIso(desde, -1);
      const prevDesde = shiftIso(prevHasta, -(rangeDays - 1));

      const [clients, barbers, cuts, sales, ventas, prevSales] = await Promise.all([
        getClientStatsRequest(activeFiltros),
        getBarberStatsRequest(activeFiltros),
        getCutStatsRequest(activeFiltros),
        getSaleStatsRequest(activeFiltros),
        listVentasRequest({ fechaDesde: desde, fechaHasta: hasta }),
        getSaleStatsRequest({ fechaDesde: prevDesde, fechaHasta: prevHasta }),
      ]);
      setClientStats(clients);
      setBarberStats(barbers);
      setCutStats(cuts);
      setSaleStats(sales);
      setVentasCount(ventas.length);
      setPrevTotalVentas(prevSales.totalVentas);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar las estadisticas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Estadisticas</h1>
        </div>
        <ErrorState message={error} />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <Skeleton style={{ height: 190, marginBottom: 20 }} />
        <div className="stats-tiles">
          <Skeleton style={{ height: 76, flex: 1 }} />
          <Skeleton style={{ height: 76, flex: 1 }} />
        </div>
        <Skeleton style={{ height: 140 }} />
      </div>
    );
  }

  if (!clientStats || !cutStats || !saleStats) {
    return null;
  }

  const ticketPromedio = ventasCount > 0 ? saleStats.totalVentas / ventasCount : 0;
  const pctChange =
    prevTotalVentas > 0
      ? ((saleStats.totalVentas - prevTotalVentas) / prevTotalVentas) * 100
      : saleStats.totalVentas > 0
        ? 100
        : 0;
  const mix = buildMix(cutStats.porTipo, cutStats.totalCortes);
  const serie = saleStats.serieDiaria;

  return (
    <div>
      <div className="page-header">
        <h1>Estadisticas</h1>
        <div className="filters-row">
          <input
            id="fechaDesde"
            type="date"
            aria-label="Desde"
            value={filtros.fechaDesde ?? ''}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value || undefined }))}
          />
          <input
            id="fechaHasta"
            type="date"
            aria-label="Hasta"
            value={filtros.fechaHasta ?? ''}
            onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value || undefined }))}
          />
          <button type="button" className="button-secondary" onClick={() => load(filtros)}>
            Filtrar
          </button>
        </div>
      </div>

      <div className="stats-hero">
        <div className="stats-hero-label">Facturacion del periodo</div>
        <div className="stats-hero-value">{formatCurrency(saleStats.totalVentas)}</div>
        <div className="stats-hero-change">
          <span className={`stats-change-pill ${pctChange >= 0 ? 'up' : 'down'}`}>
            {pctChange >= 0 ? '+' : ''}
            {pctChange.toFixed(1)}%
          </span>
          <span className="stats-hero-legend">vs periodo anterior</span>
        </div>
        {serie.length > 1 && (
          <>
            <div className="stats-hero-chart">
              <LineChart series={serie.map((d) => d.total)} />
            </div>
            <div className="stats-hero-axis">
              <span>{formatDiaCorto(serie[0].date)}</span>
              <span>{formatDiaCorto(serie[serie.length - 1].date)}</span>
            </div>
          </>
        )}
      </div>

      <div className="stats-tiles">
        <div className="stats-tile">
          <div className="stats-tile-label">Ticket promedio</div>
          <div className="stats-tile-value">{formatCurrency(ticketPromedio)}</div>
        </div>
        <div className="stats-tile">
          <div className="stats-tile-label">Cortes registrados</div>
          <div className="stats-tile-value">{cutStats.totalCortes}</div>
        </div>
      </div>

      {mix.length > 0 && (
        <div className="stats-mix-card">
          <h2>Mix de servicios</h2>
          <div className="stats-mix-bar">
            {mix.map((m) => (
              <span key={m.nombre} style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
            ))}
          </div>
          <div className="stats-mix-legend">
            {mix.map((m) => (
              <div key={m.nombre} className="stats-mix-legend-row">
                <span className="stats-mix-dot" style={{ backgroundColor: m.color }} />
                <span className="stats-mix-legend-name">{m.nombre}</span>
                <span className="stats-mix-legend-pct">{m.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
      </div>

      <h2>Ranking por profesional</h2>
      <div className="table-wrap table-wrap--cards">
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
                <td data-label="Barbero">{b.barberoNombre}</td>
                <td data-label="Cortes" className="font-mono">
                  {b.cortesRealizados}
                </td>
                <td data-label="Ventas" className="font-mono">
                  {formatCurrency(b.ventasGeneradas)}
                </td>
                <td data-label="Horas" className="font-mono">
                  {b.horasTrabajadas.toFixed(1)} hs
                </td>
              </tr>
            ))}
            {barberStats.length === 0 && (
              <tr>
                <td colSpan={4} data-label="">
                  <EmptyState message="No hay actividad de barberos en el periodo." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
