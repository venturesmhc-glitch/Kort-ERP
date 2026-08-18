import { useEffect, useState } from 'react';
import {
  exportContableReportRequest,
  exportStockReportRequest,
  exportVentasCortesReportRequest,
  getStockReportRequest,
} from './reports.api';
import type { StockReportRow } from './reports.types';
import type { NivelStock } from '../articulos/articulos.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { listPublicBarberosRequest } from '../users/users.api';
import type { PublicBarbero } from '../users/users.types';
import { formatCurrency, todayIso } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/toast/ToastProvider';
import { PlanGate } from '../../components/PlanGate';

const NIVEL_LABEL: Record<NivelStock, string> = { ok: 'OK', bajo: 'Bajo', critico: 'Critico' };

function ReportsPageContent() {
  const toast = useToast();
  const [stock, setStock] = useState<StockReportRow[]>([]);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [barberos, setBarberos] = useState<PublicBarbero[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<NivelStock | ''>('');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'stock'>('nombre');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [barberoId, setBarberoId] = useState('');

  async function loadStock() {
    setLoading(true);
    setError(null);
    try {
      const data = await getStockReportRequest({
        tipoProductoId: tipoFiltro || undefined,
        estado: estadoFiltro || undefined,
      });
      setStock(data);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudo cargar el reporte de stock.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    listActiveCatalogItemsRequest('tipos-producto').then(setTipos);
    listPublicBarberosRequest().then(setBarberos);
  }, []);

  useEffect(() => {
    loadStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoFiltro, estadoFiltro]);

  const stockOrdenado = [...stock].sort((a, b) =>
    ordenarPor === 'stock' ? a.stock - b.stock : a.nombre.localeCompare(b.nombre)
  );

  async function handleExportStock(format: 'xlsx' | 'pdf') {
    setExporting(true);
    try {
      await exportStockReportRequest(
        { tipoProductoId: tipoFiltro || undefined, estado: estadoFiltro || undefined },
        format
      );
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo generar el archivo.'));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportContable() {
    setExporting(true);
    try {
      await exportContableReportRequest(dateFrom, dateTo);
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo generar el archivo.'));
    } finally {
      setExporting(false);
    }
  }

  async function handleExportVentasCortes() {
    setExporting(true);
    try {
      await exportVentasCortesReportRequest(dateFrom, dateTo, barberoId || undefined);
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo generar el archivo.'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Reportes</h1>
      </div>

      <div className="card">
        <h2>Listado de stock</h2>
        <div className="filters-row">
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)}>
            <option value="">Todas las categorias</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
          <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as NivelStock | '')}>
            <option value="">Todos los estados</option>
            <option value="ok">OK</option>
            <option value="bajo">Bajo</option>
            <option value="critico">Critico</option>
          </select>
          <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value as 'nombre' | 'stock')}>
            <option value="nombre">Ordenar por nombre</option>
            <option value="stock">Ordenar por stock</option>
          </select>
          <button type="button" onClick={() => handleExportStock('xlsx')} disabled={exporting}>
            Exportar Excel
          </button>
          <button type="button" onClick={() => handleExportStock('pdf')} disabled={exporting}>
            Exportar PDF
          </button>
        </div>

        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Articulo</th>
                  <th>Categoria</th>
                  <th>Stock</th>
                  <th>Minimo</th>
                  <th>Critico</th>
                  <th>Estado</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {stockOrdenado.map((row) => (
                  <tr key={row.id}>
                    <td>{row.nombre}</td>
                    <td>{row.categoriaNombre}</td>
                    <td>{row.stock}</td>
                    <td>{row.stockMinimo ?? '-'}</td>
                    <td>{row.stockCritico ?? '-'}</td>
                    <td>
                      <StatusBadge
                        tone={row.nivel === 'critico' ? 'danger' : row.nivel === 'bajo' ? 'warning' : 'success'}
                      >
                        {NIVEL_LABEL[row.nivel]}
                      </StatusBadge>
                    </td>
                    <td>{formatCurrency(row.precio)}</td>
                  </tr>
                ))}
                {stockOrdenado.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState message="No hay articulos que coincidan con el filtro." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Reporte contable</h2>
        <p className="text-muted">
          Movimientos de Tesoreria (ingresos y egresos) con saldo acumulado, para uso contable.
        </p>
        <div className="filters-row">
          <label htmlFor="contableDesde">Desde</label>
          <input
            id="contableDesde"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <label htmlFor="contableHasta">Hasta</label>
          <input id="contableHasta" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button type="button" onClick={handleExportContable} disabled={exporting}>
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Ventas y cortes</h2>
        <p className="text-muted">Total de ventas y cortes por rango de fechas, filtrable por barbero.</p>
        <div className="filters-row">
          <select value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
            <option value="">Todos los barberos</option>
            {barberos.map((barbero) => (
              <option key={barbero.id} value={barbero.id}>
                {barbero.firstName} {barbero.lastName}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleExportVentasCortes} disabled={exporting}>
            Exportar PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <PlanGate feature="Los reportes y exportacion">
      <ReportsPageContent />
    </PlanGate>
  );
}
