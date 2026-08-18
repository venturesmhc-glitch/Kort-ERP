import { useEffect, useState, type FormEvent } from 'react';
import type { Supplier } from './suppliers.types';
import { supplierProductFormSchema, type SupplierProductFormValues } from './suppliers.schema';
import {
  listArticlesCatalogRequest,
  removeSupplierProductRequest,
  upsertSupplierProductRequest,
  type ArticleCatalogItem,
} from './suppliers.api';
import { formatCurrency } from '../../lib/format';
import { Toggle } from '../../components/Toggle';
import { useToast } from '../../components/toast/ToastProvider';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';
import { ApiError } from '../../lib/apiClient';

interface SupplierProductsPanelProps {
  supplier: Supplier;
  onChanged: () => Promise<void>;
}

const EMPTY_VALUES: SupplierProductFormValues = {
  articleId: '',
  precioCosto: 0,
  esPreferido: false,
};

export function SupplierProductsPanel({ supplier, onChanged }: SupplierProductsPanelProps) {
  const toast = useToast();
  const [articulos, setArticulos] = useState<ArticleCatalogItem[]>([]);
  const [values, setValues] = useState<SupplierProductFormValues>(EMPTY_VALUES);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listArticlesCatalogRequest().then(setArticulos);
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = supplierProductFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setSaving(true);
    try {
      await upsertSupplierProductRequest(supplier.id, parsed.data);
      setValues(EMPTY_VALUES);
      await onChanged();
      toast.success('Precio actualizado');
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar el precio'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(articleId: string) {
    if (!confirm('¿Quitar este articulo del proveedor?')) return;
    try {
      await removeSupplierProductRequest(supplier.id, articleId);
      await onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo quitar el articulo'));
    }
  }

  return (
    <div className="supplier-products">
      {supplier.productos.length === 0 ? (
        <p className="text-muted">Este proveedor todavia no tiene productos cargados.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Articulo</th>
              <th>Precio de costo</th>
              <th>Entrega (dias)</th>
              <th>Preferido</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {supplier.productos.map((producto) => (
              <tr key={producto.id}>
                <td>{producto.articleNombre}</td>
                <td>{formatCurrency(producto.precioCosto)}</td>
                <td>{producto.tiempoEntregaDias ?? '-'}</td>
                <td>{producto.esPreferido ? 'Si' : 'No'}</td>
                <td className="data-table-actions">
                  <button type="button" onClick={() => handleRemove(producto.articleId)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form className="client-form" onSubmit={handleSubmit}>
        <label htmlFor="articleId">Articulo</label>
        <select
          id="articleId"
          value={values.articleId}
          onChange={(e) => setValues((prev) => ({ ...prev, articleId: e.target.value }))}
        >
          <option value="">Selecciona un articulo</option>
          {articulos.map((articulo) => (
            <option key={articulo.id} value={articulo.id}>
              {articulo.name}
            </option>
          ))}
        </select>
        {getFieldError(issues, 'articleId') && (
          <p className="form-error">{getFieldError(issues, 'articleId')}</p>
        )}

        <label htmlFor="precioCosto">Precio de costo</label>
        <input
          id="precioCosto"
          type="number"
          min="0"
          step="1"
          value={values.precioCosto}
          onChange={(e) => setValues((prev) => ({ ...prev, precioCosto: Number(e.target.value) }))}
        />
        {getFieldError(issues, 'precioCosto') && (
          <p className="form-error">{getFieldError(issues, 'precioCosto')}</p>
        )}

        <label htmlFor="tiempoEntregaDias">Tiempo de entrega en dias (opcional)</label>
        <input
          id="tiempoEntregaDias"
          type="number"
          min="0"
          step="1"
          value={values.tiempoEntregaDias ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            setValues((prev) => ({
              ...prev,
              tiempoEntregaDias: raw === '' ? undefined : Number(raw),
            }));
          }}
        />

        <div className="checkbox-field">
          <Toggle
            checked={values.esPreferido ?? false}
            onChange={(esPreferido) => setValues((prev) => ({ ...prev, esPreferido }))}
            label="Proveedor preferido para este articulo"
          />
          <span>Proveedor preferido para este articulo</span>
        </div>

        <div className="client-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Agregar / actualizar precio'}
          </button>
        </div>
      </form>
    </div>
  );
}
