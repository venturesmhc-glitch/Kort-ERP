import { useEffect, useState } from 'react';
import { crearVentaRequest, listVentasRequest } from './ventas.api';
import { VentaForm } from './VentaForm';
import type { Venta } from './ventas.types';
import type { VentaFormValues } from './ventas.schema';
import { formatCurrency, formatDate } from '../../lib/format';

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadVentas() {
    setLoading(true);
    try {
      const data = await listVentasRequest();
      setVentas([...data].reverse());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVentas();
  }, []);

  async function handleCreate(values: VentaFormValues) {
    await crearVentaRequest(values);
    setShowForm(false);
    await loadVentas();
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

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Articulo</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas.map((venta) => (
                <tr key={venta.id}>
                  <td>{formatDate(venta.fecha)}</td>
                  <td>{venta.articuloNombre}</td>
                  <td>{venta.cantidad}</td>
                  <td>{formatCurrency(venta.precioUnitario)}</td>
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
