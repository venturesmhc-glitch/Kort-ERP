import { useEffect, useState, type FormEvent } from 'react';
import { ventaFormSchema, type VentaFormValues } from './ventas.schema';
import { listPublicArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { formatCurrency } from '../../lib/format';

interface VentaFormProps {
  onSubmit: (values: VentaFormValues) => Promise<void>;
  onCancel: () => void;
}

export function VentaForm({ onSubmit, onCancel }: VentaFormProps) {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [values, setValues] = useState<VentaFormValues>({
    articuloId: '',
    articuloNombre: '',
    cantidad: 1,
    precioUnitario: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPublicArticulosRequest().then((items) => {
      const disponibles = items.filter((item) => item.stock > 0);
      setArticulos(disponibles);
      const first = disponibles[0];
      if (first) {
        setValues((prev) => ({
          ...prev,
          articuloId: first.id,
          articuloNombre: first.nombre,
          precioUnitario: first.precio,
        }));
      }
    });
  }, []);

  const articuloSeleccionado = articulos.find((a) => a.id === values.articuloId);
  const total = values.cantidad * values.precioUnitario;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = ventaFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    if (articuloSeleccionado && parsed.data.cantidad > articuloSeleccionado.stock) {
      setError(`Stock insuficiente (disponible: ${articuloSeleccionado.stock})`);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="articulo">Articulo</label>
      <select
        id="articulo"
        value={values.articuloId}
        onChange={(e) => {
          const articulo = articulos.find((a) => a.id === e.target.value);
          setValues((prev) => ({
            ...prev,
            articuloId: e.target.value,
            articuloNombre: articulo?.nombre ?? '',
            precioUnitario: articulo?.precio ?? 0,
          }));
        }}
      >
        {articulos.length === 0 && <option value="">Sin stock disponible</option>}
        {articulos.map((articulo) => (
          <option key={articulo.id} value={articulo.id}>
            {articulo.nombre} (stock: {articulo.stock})
          </option>
        ))}
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

      <label htmlFor="precioUnitario">Precio unitario</label>
      <input
        id="precioUnitario"
        type="number"
        min="0"
        step="0.01"
        value={values.precioUnitario}
        onChange={(e) => setValues((prev) => ({ ...prev, precioUnitario: Number(e.target.value) }))}
      />

      <p>
        Total: <strong>{formatCurrency(total)}</strong>
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="client-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" disabled={saving || articulos.length === 0}>
          {saving ? 'Confirmando...' : 'Confirmar venta'}
        </button>
      </div>
    </form>
  );
}
