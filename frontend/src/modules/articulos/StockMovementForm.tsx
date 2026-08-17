import { useState, type FormEvent } from 'react';
import { movimientoFormSchema, type MovimientoFormValues } from './articulos.schema';
import type { Articulo } from './articulos.types';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface StockMovementFormProps {
  articulo: Articulo;
  onSubmit: (values: MovimientoFormValues) => Promise<void>;
  onCancel: () => void;
}

export function StockMovementForm({ articulo, onSubmit, onCancel }: StockMovementFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<MovimientoFormValues>({
    tipo: 'ingreso',
    cantidad: 1,
    motivo: '',
  });
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = movimientoFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }
    if (parsed.data.tipo === 'egreso' && parsed.data.cantidad > articulo.stock) {
      setIssues([{ path: ['cantidad'], message: `Stock insuficiente (disponible: ${articulo.stock})` }]);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo registrar el movimiento'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <p className="text-muted">
        Movimiento de stock para <strong>{articulo.nombre}</strong> (stock actual: {articulo.stock})
      </p>

      <label htmlFor="tipo">Tipo</label>
      <select
        id="tipo"
        value={values.tipo}
        onChange={(e) => setValues((prev) => ({ ...prev, tipo: e.target.value as 'ingreso' | 'egreso' }))}
      >
        <option value="ingreso">Ingreso</option>
        <option value="egreso">Egreso</option>
      </select>

      <label htmlFor="cantidad">Cantidad</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        value={values.cantidad}
        onChange={(e) => setValues((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
      />
      {getFieldError(issues, 'cantidad') && <p className="form-error">{getFieldError(issues, 'cantidad')}</p>}

      <label htmlFor="motivo">Motivo (opcional)</label>
      <input
        id="motivo"
        value={values.motivo ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, motivo: e.target.value }))}
      />
      {getFieldError(issues, 'motivo') && <p className="form-error">{getFieldError(issues, 'motivo')}</p>}

      <div className="client-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  );
}
