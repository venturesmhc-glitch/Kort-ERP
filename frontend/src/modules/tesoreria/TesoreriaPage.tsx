import { useEffect, useState } from 'react';
import {
  createMovimientoRequest,
  deleteMovimientoRequest,
  getResumenRequest,
  listMovimientosRequest,
  type ListMovimientosFiltros,
  type TreasurySummary,
} from './tesoreria.api';
import { MovimientoForm } from './MovimientoForm';
import { MOVIMIENTO_SOURCE_LABELS, MOVIMIENTO_TIPO_LABELS, type Movimiento, type MovimientoTipoUI } from './tesoreria.types';
import type { MovimientoFormValues } from './tesoreria.schema';
import { BarChart } from '../../components/BarChart';
import { formatCurrency, formatDate, todayIso, toLocalIso } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';

function inicioDeMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function TesoreriaPage() {
  const toast = useToast();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [resumen, setResumen] = useState<TreasurySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState<ListMovimientosFiltros>({
    fechaDesde: inicioDeMes(),
    fechaHasta: todayIso(),
  });

  async function loadAll(activeFiltros: ListMovimientosFiltros) {
    setLoading(true);
    setError(null);
    try {
      const [movs, res] = await Promise.all([
        listMovimientosRequest(activeFiltros),
        getResumenRequest({ fechaDesde: activeFiltros.fechaDesde, fechaHasta: activeFiltros.fechaHasta }),
      ]);
      setMovimientos(movs);
      setResumen(res);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudo cargar la informacion de tesoreria.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(values: MovimientoFormValues) {
    await createMovimientoRequest(values);
    setShowForm(false);
    await loadAll(filtros);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await deleteMovimientoRequest(id);
      await loadAll(filtros);
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el movimiento.'));
    }
  }

  function handleFiltrar() {
    loadAll(filtros);
  }

  const totals = resumen?.totals;
  const breakeven = resumen?.breakeven;

  return (
    <div>
      <div className="page-header">
        <h1>Tesoreria</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo movimiento
          </button>
        )}
      </div>

      {showForm && <MovimientoForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

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
        <label htmlFor="tipoFiltro">Tipo</label>
        <select
          id="tipoFiltro"
          value={filtros.tipo ?? ''}
          onChange={(e) =>
            setFiltros((prev) => ({
              ...prev,
              tipo: (e.target.value || undefined) as MovimientoTipoUI | undefined,
            }))
          }
        >
          <option value="">Todos</option>
          {Object.entries(MOVIMIENTO_TIPO_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleFiltrar}>
          Filtrar
        </button>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : !totals || !breakeven ? null : (
        <>
          <div className="stat-row">
            <div className="stat-tile">
              <span className="stat-label">Ingresos</span>
              <span className="stat-value">{formatCurrency(totals.income)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Costos fijos</span>
              <span className="stat-value">{formatCurrency(totals.fixedCosts)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Costos variables</span>
              <span className="stat-value">{formatCurrency(totals.variableCosts)}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-label">Resultado</span>
              <span className="stat-value">{formatCurrency(totals.result)}</span>
            </div>
          </div>

          <div className="card">
            <h2>Punto de equilibrio</h2>
            {breakeven.breakevenRevenue !== null ? (
              <p className="text-muted">
                Ingreso minimo estimado para no estar en perdida en el periodo:{' '}
                <strong>{formatCurrency(breakeven.breakevenRevenue)}</strong> (margen de contribucion
                aproximado: {((breakeven.contributionMarginRatio ?? 0) * 100).toFixed(1)}%).
              </p>
            ) : (
              <p className="text-muted">
                Con los costos variables cargados en el periodo, el margen de contribucion es nulo o
                negativo - no hay un ingreso objetivo finito. Revisa la carga de costos variables.
              </p>
            )}
            <p className="text-muted">
              Calculo aproximado sobre los movimientos del periodo (no hay costo real por
              articulo/corte todavia): asume que el costo variable escala con el ingreso.
              {breakeven.reachedAt
                ? ` El acumulado del periodo paso a favor el ${formatDate(breakeven.reachedAt)}.`
                : ' Los ingresos acumulados todavia no superaron a los costos acumulados en este periodo.'}
            </p>
            <BarChart
              data={[
                { label: 'Ingresos', value: totals.income },
                { label: 'Punto eq.', value: breakeven.breakevenRevenue ?? 0 },
                { label: 'Costos fijos', value: totals.fixedCosts },
                { label: 'Costos var.', value: totals.variableCosts },
              ]}
              formatValue={formatCurrency}
            />
          </div>

          {resumen.categoryBreakdown.length > 0 && (
            <div className="card">
              <h2>Por categoria</h2>
              <BarChart
                data={resumen.categoryBreakdown.map((c) => ({ label: c.categoryName, value: c.total }))}
                color="var(--color-accent)"
                formatValue={formatCurrency}
              />
            </div>
          )}

          <h2>Historico de movimientos</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descripcion</th>
                  <th>Origen</th>
                  <th>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{formatDate(toLocalIso(new Date(m.fecha)))}</td>
                    <td>{MOVIMIENTO_TIPO_LABELS[m.tipoUI]}</td>
                    <td>{m.categoriaNombre}</td>
                    <td>{m.descripcion ?? '-'}</td>
                    <td>{MOVIMIENTO_SOURCE_LABELS[m.source]}</td>
                    <td>{formatCurrency(m.monto)}</td>
                    <td className="data-table-actions">
                      {m.source === 'MANUAL' && (
                        <button type="button" onClick={() => handleDelete(m.id)}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState message="No hay movimientos cargados todavia." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
