import { useEffect, useState, type FormEvent } from 'react';
import { movimientoFormSchema, type MovimientoFormValues } from './tesoreria.schema';
import { MOVIMIENTO_TIPO_LABELS, type MovimientoTipoUI } from './tesoreria.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { todayIso } from '../../lib/format';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

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

function catalogKeyForTipo(tipo: MovimientoTipoUI) {
  return tipo === 'ingreso' ? 'categorias-ingresos' : 'categorias-costos';
}

export function MovimientoForm({ onSubmit, onCancel }: MovimientoFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<MovimientoFormValues>(EMPTY_VALUES);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
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
    setIssues(undefined);

    const parsed = movimientoFormSchema.safeParse(values);
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
      toast.error(getErrorMessage(err, 'No se pudo guardar el movimiento'));
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
        onChange={(e) => setValues((prev) => ({ ...prev, tipo: e.target.value as MovimientoTipoUI }))}
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
      {getFieldError(issues, 'categoriaId') && (
        <p className="form-error">{getFieldError(issues, 'categoriaId')}</p>
      )}

      <label htmlFor="monto">Monto</label>
      <input
        id="monto"
        type="number"
        min="0"
        step="0.01"
        value={values.monto}
        onChange={(e) => setValues((prev) => ({ ...prev, monto: Number(e.target.value) }))}
      />
      {getFieldError(issues, 'monto') && <p className="form-error">{getFieldError(issues, 'monto')}</p>}

      <label htmlFor="fecha">Fecha</label>
      <input
        id="fecha"
        type="date"
        value={values.fecha}
        onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
      />
      {getFieldError(issues, 'fecha') && <p className="form-error">{getFieldError(issues, 'fecha')}</p>}

      <label htmlFor="descripcion">Descripcion (opcional)</label>
      <input
        id="descripcion"
        value={values.descripcion}
        onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
      />
      {getFieldError(issues, 'descripcion') && (
        <p className="form-error">{getFieldError(issues, 'descripcion')}</p>
      )}

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
