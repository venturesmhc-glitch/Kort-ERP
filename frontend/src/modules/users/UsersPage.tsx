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

export function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await listUsersRequest());
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
    if (!confirm('¿Eliminar este usuario?')) return;
    await deleteUserRequest(id);
    await loadUsers();
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
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingUser(null)}
        />
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
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
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.phone ?? '-'}</td>
                  <td>
                    <span className={user.active ? 'badge badge-success' : 'badge badge-muted'}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => setEditingUser(user)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(user.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay usuarios cargados todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
