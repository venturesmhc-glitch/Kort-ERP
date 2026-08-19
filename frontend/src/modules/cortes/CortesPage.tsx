import { useEffect, useState } from 'react';
import { crearCorteRequest, deleteCorteRequest, listCortesRequest } from './cortes.api';
import { CorteForm } from './CorteForm';
import { TiposCorteTab } from './TiposCorteTab';
import type { Corte } from './cortes.types';
import type { CorteFormValues } from './cortes.schema';
import { formatCurrency, formatDate } from '../../lib/format';
import { useAuth } from '../auth/AuthContext';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';

type CortesTab = 'registro' | 'tipos';

export function CortesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canDelete = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const [tab, setTab] = useState<CortesTab>('registro');
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadCortes() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCortesRequest();
      setCortes([...data].reverse());
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los cortes.'));
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
    try {
      await deleteCorteRequest(id);
      await loadCortes();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el corte.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Cortes</h1>
        {tab === 'registro' && !showForm && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo corte
          </button>
        )}
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'registro' ? 'tab active' : 'tab'}
          onClick={() => setTab('registro')}
        >
          Registro de cortes
        </button>
        <button type="button" className={tab === 'tipos' ? 'tab active' : 'tab'} onClick={() => setTab('tipos')}>
          Tipos de corte
        </button>
      </div>

      {tab === 'tipos' ? (
        <TiposCorteTab />
      ) : (
        <>
          {showForm && <CorteForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

          {loading ? (
            <PageSkeleton />
          ) : error ? (
            <ErrorState message={error} />
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
                    {canDelete && <th></th>}
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
                      {canDelete && (
                        <td className="data-table-actions">
                          <button type="button" onClick={() => handleDelete(corte.id)}>
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {cortes.length === 0 && (
                    <tr>
                      <td colSpan={canDelete ? 7 : 6}>
                        <EmptyState message="No hay cortes registrados todavia." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
