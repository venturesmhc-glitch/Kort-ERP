import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { articuloFormSchema, type ArticuloFormValues } from './articulos.schema';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';

interface ArticuloFormProps {
  initialValues?: ArticuloFormValues;
  initialImagenUrl?: string;
  onSubmit: (values: ArticuloFormValues, imagenFile: File | null) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: ArticuloFormValues = {
  nombre: '',
  descripcion: '',
  tipoProductoId: '',
  tipoProductoNombre: '',
  precio: 0,
};

export function ArticuloForm({
  initialValues = EMPTY_VALUES,
  initialImagenUrl,
  onSubmit,
  onCancel,
}: ArticuloFormProps) {
  const isEditing = initialValues !== EMPTY_VALUES;
  const [values, setValues] = useState<ArticuloFormValues>(initialValues);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | undefined>(initialImagenUrl);
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
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
      await onSubmit(parsed.data, imagenFile);
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

      <label htmlFor="descripcion">Descripcion (opcional)</label>
      <input
        id="descripcion"
        value={values.descripcion ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
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
        step="1"
        value={values.precio}
        onChange={(e) => setValues((prev) => ({ ...prev, precio: Number(e.target.value) }))}
      />

      <label htmlFor="umbralStockBajo">Umbral de stock bajo (opcional)</label>
      <input
        id="umbralStockBajo"
        type="number"
        min="0"
        step="1"
        value={values.umbralStockBajo ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          setValues((prev) => ({ ...prev, umbralStockBajo: raw === '' ? undefined : Number(raw) }));
        }}
      />

      {!isEditing && (
        <>
          <label htmlFor="stockInicial">Stock inicial (opcional)</label>
          <input
            id="stockInicial"
            type="number"
            min="0"
            step="1"
            value={values.stockInicial ?? ''}
            onChange={(e) => {
              const raw = e.target.value;
              setValues((prev) => ({ ...prev, stockInicial: raw === '' ? undefined : Number(raw) }));
            }}
          />
        </>
      )}

      <label htmlFor="imagen">Imagen (opcional)</label>
      <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
      {imagenPreview && <img src={imagenPreview} alt="Vista previa" className="image-upload-preview" />}

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
