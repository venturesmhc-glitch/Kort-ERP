import { useEffect, useState } from 'react';
import {
  createClientRequest,
  deleteClientRequest,
  listClientsRequest,
  updateClientRequest,
} from './clients.api';
import { ClientForm } from './ClientForm';
import type { Client } from './clients.types';
import type { ClientFormValues } from './clients.schema';
import { EmptyState, ErrorState, LoadingState, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { useAuth } from '../auth/AuthContext';

export function ClientsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canDelete = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadClients() {
    setLoading(true);
    setError(null);
    try {
      const data = await listClientsRequest();
      setClients(data);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los clientes.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleCreate(values: ClientFormValues) {
    await createClientRequest(values);
    setShowForm(false);
    await loadClients();
  }

  async function handleUpdate(values: ClientFormValues) {
    if (!editingClient) return;
    await updateClientRequest(editingClient.id, values);
    setEditingClient(null);
    await loadClients();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return;
    try {
      await deleteClientRequest(id);
      await loadClients();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el cliente.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        {!showForm && !editingClient && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo cliente
          </button>
        )}
      </div>

      {showForm && (
        <ClientForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingClient && (
        <ClientForm
          initialValues={{
            firstName: editingClient.firstName,
            lastName: editingClient.lastName,
            phone: editingClient.phone,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingClient(null)}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Telefono</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.firstName}</td>
                <td>{client.lastName}</td>
                <td>{client.phone}</td>
                <td className="data-table-actions">
                  <button type="button" onClick={() => setEditingClient(client)}>
                    Editar
                  </button>
                  {canDelete && (
                    <button type="button" onClick={() => handleDelete(client.id)}>
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <EmptyState message="No hay clientes cargados todavia." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
