import { useEffect, useState } from 'react';
import { crearVentaRequest, listVentasRequest, type ListVentasFiltros } from './ventas.api';
import { VentaForm } from './VentaForm';
import type { Venta } from './ventas.types';
import type { CrearVentaInput } from './ventas.api';
import { listPublicArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { formatCurrency, formatDate, toLocalIso } from '../../lib/format';

function fechaHora(iso: string) {
  return `${formatDate(toLocalIso(new Date(iso)))} ${new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState<ListVentasFiltros>({});

  async function loadVentas(activeFiltros: ListVentasFiltros) {
    setLoading(true);
    try {
      setVentas(await listVentasRequest(activeFiltros));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVentas(filtros);
    listPublicArticulosRequest().then(setArticulos).catch(() => setArticulos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(values: CrearVentaInput) {
    await crearVentaRequest(values);
    setShowForm(false);
    await loadVentas(filtros);
  }

  function handleFiltrar() {
    loadVentas(filtros);
  }

  const totalVendido = ventas.reduce((sum, v) => sum + v.total, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Ventas</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nueva venta
          </button>
        )}
      </div>

      {showForm && <VentaForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Ventas registradas</span>
          <span className="stat-value">{ventas.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Total vendido</span>
          <span className="stat-value">{formatCurrency(totalVendido)}</span>
        </div>
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
        <label htmlFor="articuloFiltro">Articulo</label>
        <select
          id="articuloFiltro"
          value={filtros.articuloId ?? ''}
          onChange={(e) => setFiltros((prev) => ({ ...prev, articuloId: e.target.value || undefined }))}
        >
          <option value="">Todos</option>
          {articulos.map((articulo) => (
            <option key={articulo.id} value={articulo.id}>
              {articulo.nombre}
            </option>
          ))}
        </select>
        <button type="button" onClick={handleFiltrar}>
          Filtrar
        </button>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Articulos</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id}>
                  <td>{fechaHora(venta.fecha)}</td>
                  <td>{venta.clienteNombre ?? 'Mostrador'}</td>
                  <td>{venta.vendedorNombre ?? '-'}</td>
                  <td>{venta.items.map((item) => `${item.articuloNombre} x${item.cantidad}`).join(', ')}</td>
                  <td>{formatCurrency(venta.total)}</td>
                </tr>
              ))}
              {ventas.length === 0 && (
                <tr>
                  <td colSpan={5}>No hay ventas registradas todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
