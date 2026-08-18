import { useEffect, useState } from 'react';
import {
  createUserRequest,
  deleteUserRequest,
  listUsersRequest,
  updateUserRequest,
} from './users.api';
import { UserForm } from './UserForm';
import type { AppUser } from './users.types';
import type { UserFormValues } from './users.schema';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/toast/ToastProvider';

export function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsersRequest());
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los usuarios.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(values: UserFormValues) {
    await createUserRequest(values);
    setShowForm(false);
    await loadUsers();
  }

  async function handleUpdate(values: UserFormValues) {
    if (!editingUser) return;
    await updateUserRequest(editingUser.id, values);
    setEditingUser(null);
    await loadUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este usuario? No va a poder iniciar sesión ni aparecer como barbero disponible.'))
      return;
    try {
      await deleteUserRequest(id);
      await loadUsers();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo desactivar el usuario.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Usuarios</h1>
        {!showForm && !editingUser && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo usuario
          </button>
        )}
      </div>

      {showForm && <UserForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {editingUser && (
        <UserForm
          initialValues={{
            firstName: editingUser.firstName,
            lastName: editingUser.lastName,
            email: editingUser.email,
            role: editingUser.role,
            dni: editingUser.dni ?? '',
            phone: editingUser.phone ?? '',
            address: editingUser.address ?? '',
            active: editingUser.active,
            password: '',
          }}
          isEditing
          onSubmit={handleUpdate}
          onCancel={() => setEditingUser(null)}
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
                <th>Email</th>
                <th>Rol</th>
                <th>Telefono</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nombre">
                    {user.firstName} {user.lastName}
                  </td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Rol">{user.role}</td>
                  <td data-label="Telefono">{user.phone ?? '-'}</td>
                  <td data-label="Estado">
                    <StatusBadge tone={user.active ? 'success' : 'muted'}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </td>
                  <td className="data-table-actions" data-label="">
                    <button type="button" onClick={() => setEditingUser(user)}>
                      Editar
                    </button>
                    {user.active && (
                      <button type="button" onClick={() => handleDelete(user.id)}>
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} data-label="">
                    <EmptyState message="No hay usuarios cargados todavia." />
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
