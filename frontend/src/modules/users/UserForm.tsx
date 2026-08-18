import { useState, type FormEvent } from 'react';
import { userFormSchema, type UserFormValues } from './users.schema';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../auth/auth.types';
import { Toggle } from '../../components/Toggle';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface UserFormProps {
  initialValues?: UserFormValues;
  isEditing?: boolean;
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
  password: '',
};

const ROLE_LABELS: Record<Role, string> = {
  DEV: 'Dev',
  ENCARGADO: 'Encargado',
  BARBERO: 'Barbero',
};

export function UserForm({
  initialValues = EMPTY_VALUES,
  isEditing = false,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState<UserFormValues>(initialValues);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const availableRoles: Role[] =
    currentUser?.role === 'DEV' ? ['DEV', 'ENCARGADO', 'BARBERO'] : ['ENCARGADO', 'BARBERO'];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = userFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    if (!isEditing && !parsed.data.password) {
      setIssues([{ path: ['password'], message: 'La contrasena es requerida para crear un usuario' }]);
      return;
    }

    if (!availableRoles.includes(parsed.data.role)) {
      setIssues([{ path: ['role'], message: 'No tenes permiso para asignar ese rol' }]);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar el usuario'));
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
      {getFieldError(issues, 'firstName') && (
        <p className="form-error">{getFieldError(issues, 'firstName')}</p>
      )}

      <label htmlFor="lastName">Apellido</label>
      <input
        id="lastName"
        value={values.lastName}
        onChange={(e) => setValues((prev) => ({ ...prev, lastName: e.target.value }))}
      />
      {getFieldError(issues, 'lastName') && (
        <p className="form-error">{getFieldError(issues, 'lastName')}</p>
      )}

      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={values.email}
        onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
      />
      {getFieldError(issues, 'email') && <p className="form-error">{getFieldError(issues, 'email')}</p>}

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
      {getFieldError(issues, 'role') && <p className="form-error">{getFieldError(issues, 'role')}</p>}

      <label htmlFor="dni">DNI</label>
      <input
        id="dni"
        value={values.dni}
        onChange={(e) => setValues((prev) => ({ ...prev, dni: e.target.value }))}
      />
      {getFieldError(issues, 'dni') && <p className="form-error">{getFieldError(issues, 'dni')}</p>}

      <label htmlFor="phone">Telefono</label>
      <input
        id="phone"
        value={values.phone}
        onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
      />
      {getFieldError(issues, 'phone') && <p className="form-error">{getFieldError(issues, 'phone')}</p>}

      <label htmlFor="address">Domicilio</label>
      <input
        id="address"
        value={values.address}
        onChange={(e) => setValues((prev) => ({ ...prev, address: e.target.value }))}
      />
      {getFieldError(issues, 'address') && <p className="form-error">{getFieldError(issues, 'address')}</p>}

      <label htmlFor="password">{isEditing ? 'Nueva contrasena (opcional)' : 'Contrasena'}</label>
      <input
        id="password"
        type="password"
        value={values.password ?? ''}
        placeholder={isEditing ? 'Dejar en blanco para no cambiarla' : ''}
        onChange={(e) => setValues((prev) => ({ ...prev, password: e.target.value }))}
      />
      {getFieldError(issues, 'password') && (
        <p className="form-error">{getFieldError(issues, 'password')}</p>
      )}

      <div className="checkbox-field">
        <Toggle
          checked={values.active}
          onChange={(active) => setValues((prev) => ({ ...prev, active }))}
          label="Activo"
        />
        <span>Activo</span>
      </div>

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
