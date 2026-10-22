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
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { useAuth } from '../auth/AuthContext';
import { redeemLoyaltyPointsRequest } from '../loyalty/loyalty.api';
import { getErrorMessage } from '../../lib/apiErrors';

export function ClientsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canDelete = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const canRedeem = user?.role === 'DEV' || user?.role === 'ENCARGADO';
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

  async function handleRedeem(client: Client) {
    const input = window.prompt(
      `${client.firstName} ${client.lastName} tiene ${client.loyaltyPoints} puntos. ¿Cuántos querés canjear?`,
      String(client.loyaltyPoints)
    );
    if (!input) return;
    const points = Number(input);
    if (!Number.isInteger(points) || points <= 0) {
      toast.error('Ingresa una cantidad de puntos valida');
      return;
    }
    try {
      const discount = await redeemLoyaltyPointsRequest(client.id, points);
      toast.success(`Cupon generado: ${discount.code} ($${discount.value} de descuento)`);
      await loadClients();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo canjear los puntos'));
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
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap table-wrap--cards">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Telefono</th>
                <th>Puntos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td data-label="Nombre">{client.firstName}</td>
                  <td data-label="Apellido">{client.lastName}</td>
                  <td data-label="Telefono">{client.phone}</td>
                  <td data-label="Puntos">{client.loyaltyPoints}</td>
                  <td className="data-table-actions" data-label="">
                    <button type="button" onClick={() => setEditingClient(client)}>
                      Editar
                    </button>
                    {canRedeem && client.loyaltyPoints > 0 && (
                      <button type="button" onClick={() => handleRedeem(client)}>
                        Canjear puntos
                      </button>
                    )}
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
                  <td colSpan={5} data-label="">
                    <EmptyState message="No hay clientes cargados todavia." />
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
