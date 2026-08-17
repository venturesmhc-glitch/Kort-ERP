import { useEffect, useState } from 'react';
import { crearCorteRequest, deleteCorteRequest, listCortesRequest } from './cortes.api';
import { CorteForm } from './CorteForm';
import type { Corte } from './cortes.types';
import type { CorteFormValues } from './cortes.schema';
import { formatCurrency, formatDate } from '../../lib/format';

export function CortesPage() {
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadCortes() {
    setLoading(true);
    try {
      const data = await listCortesRequest();
      setCortes([...data].reverse());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCortes();
  }, []);

  async function handleCreate(values: CorteFormValues) {
    await crearCorteRequest(values);
    setShowForm(false);
    await loadCortes();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro de corte?')) return;
    await deleteCorteRequest(id);
    await loadCortes();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Registro de cortes</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo corte
          </button>
        )}
      </div>

      {showForm && <CorteForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Barbero</th>
                <th>Tipo de corte</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cortes.map((corte) => (
                <tr key={corte.id}>
                  <td>
                    {corte.imagenUrl ? (
                      <img src={corte.imagenUrl} alt={corte.clienteNombre} className="row-thumb" />
                    ) : (
                      <span className="row-thumb row-thumb-empty">Sin img.</span>
                    )}
                  </td>
                  <td>{formatDate(corte.fecha)}</td>
                  <td>
                    {corte.clienteNombre} {corte.clienteApellido}
                  </td>
                  <td>{corte.barberoNombre}</td>
                  <td>{corte.tipoCorteNombre}</td>
                  <td>{formatCurrency(corte.precio)}</td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => handleDelete(corte.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {cortes.length === 0 && (
                <tr>
                  <td colSpan={7}>No hay cortes registrados todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
