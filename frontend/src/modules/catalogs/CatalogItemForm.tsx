import { useState, type FormEvent } from 'react';
import { catalogItemFormSchema, type CatalogItemFormValues } from './catalogs.schema';

interface CatalogItemFormProps {
  initialValues?: CatalogItemFormValues;
  onSubmit: (values: CatalogItemFormValues) => Promise<void>;
  onCancel: () => void;
  showPrecio?: boolean;
}

const EMPTY_VALUES: CatalogItemFormValues = { nombre: '', descripcion: '', activo: true };

export function CatalogItemForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
  showPrecio = false,
}: CatalogItemFormProps) {
  const [values, setValues] = useState<CatalogItemFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = catalogItemFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro');
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

      <label htmlFor="descripcion">Descripcion (opcional)</label>
      <input
        id="descripcion"
        value={values.descripcion}
        onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
      />

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
        </>
      )}

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={values.activo}
          onChange={(e) => setValues((prev) => ({ ...prev, activo: e.target.checked }))}
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
