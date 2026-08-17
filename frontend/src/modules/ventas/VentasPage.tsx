import { useEffect, useState } from 'react';
import { crearVentaRequest, listVentasRequest, type ListVentasFiltros } from './ventas.api';
import { VentaForm } from './VentaForm';
import type { Venta } from './ventas.types';
import type { CrearVentaInput } from './ventas.api';
import {
  cancelarMerchPedidoRequest,
  listMerchPendientesRequest,
  marcarMerchEntregadoRequest,
  type MerchPedido,
} from './merchPendientes.api';
import { listPublicArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { formatCurrency, formatDate, toLocalIso } from '../../lib/format';
import { EmptyState, ErrorState, LoadingState, toErrorMessage } from '../../components/AsyncState';

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
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filtros, setFiltros] = useState<ListVentasFiltros>({});
  const [pedidosMerch, setPedidosMerch] = useState<MerchPedido[]>([]);
  const [merchError, setMerchError] = useState<string | null>(null);

  async function loadVentas(activeFiltros: ListVentasFiltros) {
    setLoading(true);
    setError(null);
    try {
      setVentas(await listVentasRequest(activeFiltros));
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar las ventas.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadPedidosMerch() {
    setMerchError(null);
    try {
      setPedidosMerch(await listMerchPendientesRequest());
    } catch (err) {
      setMerchError(toErrorMessage(err, 'No se pudieron cargar los pedidos de merch pendientes.'));
    }
  }

  useEffect(() => {
    loadVentas(filtros);
    loadPedidosMerch();
    listPublicArticulosRequest().then(setArticulos).catch(() => setArticulos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(values: CrearVentaInput) {
    const venta = await crearVentaRequest(values);
    setShowForm(false);
    await loadVentas(filtros);
    if (venta.treasuryWarning) alert(venta.treasuryWarning);
  }

  async function handleEntregarMerch(id: string) {
    const pedido = await marcarMerchEntregadoRequest(id);
    loadPedidosMerch();
    await loadVentas(filtros);
    if (pedido.treasuryWarning) alert(pedido.treasuryWarning);
  }

  async function handleCancelarMerch(id: string) {
    if (!confirm('¿Cancelar este pedido? El stock reservado se devuelve.')) return;
    await cancelarMerchPedidoRequest(id);
    loadPedidosMerch();
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

      <h2>Pedidos de merch pendientes de retiro</h2>
      {merchError ? (
        <ErrorState message={merchError} />
      ) : (
        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Telefono</th>
                <th>Articulos</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidosMerch.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{fechaHora(pedido.fecha)}</td>
                  <td>{pedido.clienteNombre ?? '-'}</td>
                  <td>{pedido.clienteTelefono ?? '-'}</td>
                  <td>{pedido.items.map((item) => `${item.articuloNombre} x${item.cantidad}`).join(', ')}</td>
                  <td>{formatCurrency(pedido.total)}</td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => handleEntregarMerch(pedido.id)}>
                      Entregar
                    </button>
                    <button type="button" onClick={() => handleCancelarMerch(pedido.id)}>
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
              {pedidosMerch.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No hay pedidos de merch pendientes de retiro." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <h2>Ventas de mostrador</h2>
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
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
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
                  <td colSpan={5}>
                    <EmptyState message="No hay ventas registradas todavia." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
