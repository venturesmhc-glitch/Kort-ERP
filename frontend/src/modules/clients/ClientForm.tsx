import { useState, type FormEvent } from 'react';
import { clientFormSchema, type ClientFormValues } from './clients.schema';

interface ClientFormProps {
  initialValues?: ClientFormValues;
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: ClientFormValues = { firstName: '', lastName: '', phone: '' };

export function ClientForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: ClientFormProps) {
  const [values, setValues] = useState<ClientFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = clientFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cliente');
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

      <label htmlFor="phone">Telefono</label>
      <input
        id="phone"
        value={values.phone}
        onChange={(e) => setValues((prev) => ({ ...prev, phone: e.target.value }))}
      />

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
