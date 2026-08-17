import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { articuloFormSchema, type ArticuloFormValues } from './articulos.schema';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { readFileAsDataUrl } from '../../lib/mockStore';

interface ArticuloFormProps {
  initialValues?: ArticuloFormValues;
  onSubmit: (values: ArticuloFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: ArticuloFormValues = {
  nombre: '',
  tipoProductoId: '',
  tipoProductoNombre: '',
  precio: 0,
  stock: 0,
  imagenUrl: '',
};

export function ArticuloForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: ArticuloFormProps) {
  const [values, setValues] = useState<ArticuloFormValues>(initialValues);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listActiveCatalogItemsRequest('tipos-producto').then((items) => {
      setTipos(items);
      if (!initialValues.tipoProductoId && items[0]) {
        setValues((prev) => ({
          ...prev,
          tipoProductoId: items[0].id,
          tipoProductoNombre: items[0].nombre,
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setValues((prev) => ({ ...prev, imagenUrl: dataUrl }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = articuloFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el articulo');
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

      <label htmlFor="tipoProducto">Tipo de producto</label>
      <select
        id="tipoProducto"
        value={values.tipoProductoId}
        onChange={(e) => {
          const tipo = tipos.find((t) => t.id === e.target.value);
          setValues((prev) => ({
            ...prev,
            tipoProductoId: e.target.value,
            tipoProductoNombre: tipo?.nombre ?? '',
          }));
        }}
      >
        {tipos.length === 0 && <option value="">Sin tipos parametrizados</option>}
        {tipos.map((tipo) => (
          <option key={tipo.id} value={tipo.id}>
            {tipo.nombre}
          </option>
        ))}
      </select>

      <label htmlFor="precio">Precio</label>
      <input
        id="precio"
        type="number"
        min="0"
        step="0.01"
        value={values.precio}
        onChange={(e) => setValues((prev) => ({ ...prev, precio: Number(e.target.value) }))}
      />

      <label htmlFor="stock">Stock</label>
      <input
        id="stock"
        type="number"
        min="0"
        step="1"
        value={values.stock}
        onChange={(e) => setValues((prev) => ({ ...prev, stock: Number(e.target.value) }))}
      />

      <label htmlFor="imagen">Imagen (opcional)</label>
      <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
      {values.imagenUrl && (
        <img src={values.imagenUrl} alt="Vista previa" className="image-upload-preview" />
      )}

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
