import { useState, type FormEvent } from 'react';
import { supplierFormSchema, type SupplierFormValues } from './suppliers.schema';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface SupplierFormProps {
  initialValues?: SupplierFormValues;
  onSubmit: (values: SupplierFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: SupplierFormValues = {
  nombre: '',
  contacto: '',
  telefono: '',
  email: '',
  condicionesPago: '',
};

export function SupplierForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: SupplierFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<SupplierFormValues>(initialValues);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = supplierFormSchema.safeParse(values);
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
      toast.error(getErrorMessage(err, 'No se pudo guardar el proveedor'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="nombre">Nombre</label>
      <input
        id="nombre"
        value={values.nombre}
        onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
      />
      {getFieldError(issues, 'nombre') && <p className="form-error">{getFieldError(issues, 'nombre')}</p>}

      <label htmlFor="contacto">Contacto (opcional)</label>
      <input
        id="contacto"
        value={values.contacto ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, contacto: e.target.value }))}
      />

      <label htmlFor="telefono">Telefono (opcional)</label>
      <input
        id="telefono"
        value={values.telefono ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, telefono: e.target.value }))}
      />

      <label htmlFor="email">Email (opcional)</label>
      <input
        id="email"
        value={values.email ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, email: e.target.value }))}
      />
      {getFieldError(issues, 'email') && <p className="form-error">{getFieldError(issues, 'email')}</p>}

      <label htmlFor="condicionesPago">Condiciones de pago (opcional)</label>
      <input
        id="condicionesPago"
        value={values.condicionesPago ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, condicionesPago: e.target.value }))}
      />

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
