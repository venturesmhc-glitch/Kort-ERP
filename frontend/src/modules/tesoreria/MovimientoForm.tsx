import { useEffect, useState, type FormEvent } from 'react';
import { movimientoFormSchema, type MovimientoFormValues } from './tesoreria.schema';
import { MOVIMIENTO_TIPO_LABELS, type MovimientoTipo } from './tesoreria.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { todayIso } from '../../lib/format';

interface MovimientoFormProps {
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
  onCancel: () => void;
}

const TODAY = todayIso();

const EMPTY_VALUES: MovimientoFormValues = {
  tipo: 'ingreso',
  categoriaId: '',
  categoriaNombre: '',
  monto: 0,
  fecha: TODAY,
  descripcion: '',
};

function catalogKeyForTipo(tipo: MovimientoTipo) {
  return tipo === 'ingreso' ? 'categorias-ingresos' : 'categorias-costos';
}

export function MovimientoForm({ onSubmit, onCancel }: MovimientoFormProps) {
  const [values, setValues] = useState<MovimientoFormValues>(EMPTY_VALUES);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listActiveCatalogItemsRequest(catalogKeyForTipo(values.tipo)).then((items) => {
      setCategorias(items);
      setValues((prev) => ({
        ...prev,
        categoriaId: items[0]?.id ?? '',
        categoriaNombre: items[0]?.nombre ?? '',
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.tipo]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = movimientoFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el movimiento');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="tipo">Tipo</label>
      <select
        id="tipo"
        value={values.tipo}
        onChange={(e) => setValues((prev) => ({ ...prev, tipo: e.target.value as MovimientoTipo }))}
      >
        {Object.entries(MOVIMIENTO_TIPO_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <label htmlFor="categoria">Categoria</label>
      <select
        id="categoria"
        value={values.categoriaId}
        onChange={(e) => {
          const categoria = categorias.find((c) => c.id === e.target.value);
          setValues((prev) => ({
            ...prev,
            categoriaId: e.target.value,
            categoriaNombre: categoria?.nombre ?? '',
          }));
        }}
      >
        {categorias.length === 0 && <option value="">Sin categorias parametrizadas</option>}
        {categorias.map((categoria) => (
          <option key={categoria.id} value={categoria.id}>
            {categoria.nombre}
          </option>
        ))}
      </select>

      <label htmlFor="monto">Monto</label>
      <input
        id="monto"
        type="number"
        min="0"
        step="0.01"
        value={values.monto}
        onChange={(e) => setValues((prev) => ({ ...prev, monto: Number(e.target.value) }))}
      />

      <label htmlFor="fecha">Fecha</label>
      <input
        id="fecha"
        type="date"
        value={values.fecha}
        onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
      />

      <label htmlFor="descripcion">Descripcion (opcional)</label>
      <input
        id="descripcion"
        value={values.descripcion}
        onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
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
