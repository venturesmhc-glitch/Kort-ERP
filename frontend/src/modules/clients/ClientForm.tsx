import { useState, type FormEvent } from 'react';
import { clientFormSchema, type ClientFormValues } from './clients.schema';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface ClientFormProps {
  initialValues?: ClientFormValues;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: ClientFormValues = { firstName: '', lastName: '', phone: '' };

export function ClientForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: ClientFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar el cliente'));
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

      <label htmlFor="phone">Telefono</label>
      <input
        id="phone"
        value={values.phone}
        onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
      />
      {getFieldError(issues, 'phone') && <p className="form-error">{getFieldError(issues, 'phone')}</p>}

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
