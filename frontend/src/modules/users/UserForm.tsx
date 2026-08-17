import { useState, type FormEvent } from 'react';
import { userFormSchema, type UserFormValues } from './users.schema';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/auth.types';

interface UserFormProps {
  initialValues?: UserFormValues;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: UserFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'BARBERO',
  dni: '',
  phone: '',
  address: '',
  active: true,
};

const ROLE_LABELS: Record<Role, string> = {
  DEV: 'Dev',
  ENCARGADO: 'Encargado',
  BARBERO: 'Barbero',
};

export function UserForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: UserFormProps) {
  const { user: currentUser } = useAuth();
  const [values, setValues] = useState<UserFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const availableRoles: Role[] =
    currentUser?.role === 'DEV' ? ['DEV', 'ENCARGADO', 'BARBERO'] : ['ENCARGADO', 'BARBERO'];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = userFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    if (!availableRoles.includes(parsed.data.role)) {
      setError('No tenes permiso para asignar ese rol');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="firstName">Nombre</label>
      <input
        id="firstName"
        value={values.firstName}
        onChange={(e) => setValues((prev) => ({ ...prev, firstName: e.target.value }))}
      />

      <label htmlFor="lastName">Apellido</label>
      <input
        id="lastName"
        value={values.lastName}
        onChange={(e) => setValues((prev) => ({ ...prev, lastName: e.target.value }))}
      />

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={values.email}
        onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
      />

      <label htmlFor="role">Rol</label>
      <select
        id="role"
        value={values.role}
        onChange={(e) => setValues((prev) => ({ ...prev, role: e.target.value as Role }))}
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>

      <label htmlFor="dni">DNI</label>
      <input
        id="dni"
        value={values.dni}
        onChange={(e) => setValues((prev) => ({ ...prev, dni: e.target.value }))}
      />

      <label htmlFor="phone">Telefono</label>
      <input
        id="phone"
        value={values.phone}
        onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
      />

      <label htmlFor="address">Domicilio</label>
      <input
        id="address"
        value={values.address}
        onChange={(e) => setValues((prev) => ({ ...prev, address: e.target.value }))}
      />

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={values.active}
          onChange={(e) => setValues((prev) => ({ ...prev, active: e.target.checked }))}
        />
        Activo
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="client-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
