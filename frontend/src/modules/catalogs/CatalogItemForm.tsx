import { useState, type FormEvent } from 'react';
import { catalogItemFormSchema, type CatalogItemFormValues } from './catalogs.schema';
import { Toggle } from '../../components/Toggle';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface CatalogItemFormProps {
  initialValues?: CatalogItemFormValues;
  onSubmit: (values: CatalogItemFormValues) => Promise<void>;
  onCancel: () => void;
  showPrecio?: boolean;
  hideDescripcion?: boolean;
}

const EMPTY_VALUES: CatalogItemFormValues = { nombre: '', descripcion: '', activo: true };

export function CatalogItemForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
  showPrecio = false,
  hideDescripcion = false,
}: CatalogItemFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<CatalogItemFormValues>(initialValues);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = catalogItemFormSchema.safeParse(values);
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
      toast.error(getErrorMessage(err, 'No se pudo guardar el registro'));
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

      {!hideDescripcion && (
        <>
          <label htmlFor="descripcion">Descripcion (opcional)</label>
          <input
            id="descripcion"
            value={values.descripcion}
            onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
          />
          {getFieldError(issues, 'descripcion') && (
            <p className="form-error">{getFieldError(issues, 'descripcion')}</p>
          )}
        </>
      )}

      {showPrecio && (
        <>
          <label htmlFor="precio">Precio</label>
          <input
            id="precio"
            type="number"
            min="0"
            step="1"
            value={values.precio ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              setValues((prev) => ({ ...prev, precio: raw === '' ? undefined : Number(raw) }));
            }}
          />
          {getFieldError(issues, 'precio') && <p className="form-error">{getFieldError(issues, 'precio')}</p>}
        </>
      )}

      <div className="checkbox-field">
        <Toggle
          checked={values.activo}
          onChange={(activo) => setValues((prev) => ({ ...prev, activo }))}
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
