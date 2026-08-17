import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { articuloFormSchema, type ArticuloFormValues } from './articulos.schema';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

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
  const toast = useToast();
  const isEditing = initialValues !== EMPTY_VALUES;
  const [values, setValues] = useState<ArticuloFormValues>(initialValues);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreview, setImagenPreview] = useState<string | undefined>(initialImagenUrl);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
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
    setIssues(undefined);

    const parsed = articuloFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data, imagenFile);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar el articulo'));
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

      <label htmlFor="descripcion">Descripcion (opcional)</label>
      <input
        id="descripcion"
        value={values.descripcion ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, descripcion: e.target.value }))}
      />
      {getFieldError(issues, 'descripcion') && (
        <p className="form-error">{getFieldError(issues, 'descripcion')}</p>
      )}

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
      {getFieldError(issues, 'tipoProductoId') && (
        <p className="form-error">{getFieldError(issues, 'tipoProductoId')}</p>
      )}

      <label htmlFor="precio">Precio</label>
      <input
        id="precio"
        type="number"
        min="0"
        step="1"
        value={values.precio}
        onChange={(e) => setValues((prev) => ({ ...prev, precio: Number(e.target.value) }))}
      />
      {getFieldError(issues, 'precio') && <p className="form-error">{getFieldError(issues, 'precio')}</p>}

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
      {getFieldError(issues, 'umbralStockBajo') && (
        <p className="form-error">{getFieldError(issues, 'umbralStockBajo')}</p>
      )}

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
          {getFieldError(issues, 'stockInicial') && (
            <p className="form-error">{getFieldError(issues, 'stockInicial')}</p>
          )}
        </>
      )}

      <label htmlFor="imagen">Imagen (opcional)</label>
      <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
      {imagenPreview && <img src={imagenPreview} alt="Vista previa" className="image-upload-preview" />}

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
