import { useEffect, useState, type FormEvent } from 'react';
import { discountFormSchema, DISCOUNT_SCOPE_OPTIONS, DISCOUNT_TYPE_OPTIONS, type DiscountFormValues } from './discounts.schema';
import { listArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface DiscountFormProps {
  initialValues?: DiscountFormValues;
  onSubmit: (values: DiscountFormValues) => Promise<void>;
  onCancel: () => void;
}

const EMPTY_VALUES: DiscountFormValues = {
  code: '',
  name: '',
  type: 'PERCENTAGE',
  scope: 'MERCH',
  value: 10,
  applicableItems: [],
  applicableCategories: [],
  isActive: true,
};

export function DiscountForm({ initialValues = EMPTY_VALUES, onSubmit, onCancel }: DiscountFormProps) {
  const toast = useToast();
  const [values, setValues] = useState<DiscountFormValues>(initialValues);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [categorias, setCategorias] = useState<CatalogItem[]>([]);

  // Los pickers de items/categoria solo aplican a cupones de Merch (ver
  // discounts.service.ts assertDiscountBusinessRules en el backend, que
  // rechaza esos campos cuando scope=CORTES) - se cargan una sola vez, no
  // hace falta esperar a que el usuario elija scope=MERCH.
  useEffect(() => {
    listArticulosRequest().then(setArticulos).catch(() => setArticulos([]));
    listActiveCatalogItemsRequest('tipos-producto').then(setCategorias).catch(() => setCategorias([]));
  }, []);

  const showMerchFilters = values.scope !== 'CORTES';

  function toggleId(field: 'applicableItems' | 'applicableCategories', id: string) {
    setValues((prev) => {
      const current = prev[field] ?? [];
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      return { ...prev, [field]: next };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = discountFormSchema.safeParse(values);
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
      toast.error(getErrorMessage(err, 'No se pudo guardar el cupon'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="code">Codigo (opcional, se genera solo si lo dejas vacio)</label>
      <input
        id="code"
        value={values.code ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, code: e.target.value }))}
      />
      {getFieldError(issues, 'code') && <p className="form-error">{getFieldError(issues, 'code')}</p>}

      <label htmlFor="name">Nombre</label>
      <input
        id="name"
        value={values.name}
        onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))}
      />
      {getFieldError(issues, 'name') && <p className="form-error">{getFieldError(issues, 'name')}</p>}

      <label htmlFor="type">Tipo</label>
      <select
        id="type"
        value={values.type}
        onChange={(e) => setValues((prev) => ({ ...prev, type: e.target.value as DiscountFormValues['type'] }))}
      >
        {DISCOUNT_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label htmlFor="scope">Aplica a</label>
      <select
        id="scope"
        value={values.scope}
        onChange={(e) =>
          setValues((prev) => ({
            ...prev,
            scope: e.target.value as DiscountFormValues['scope'],
            ...(e.target.value === 'CORTES' ? { applicableItems: [], applicableCategories: [] } : {}),
          }))
        }
      >
        {DISCOUNT_SCOPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label htmlFor="value">
        Valor {values.type === 'PERCENTAGE' || values.type === 'ITEM_PERCENTAGE' ? '(%)' : '($)'}
      </label>
      <input
        id="value"
        type="number"
        value={values.value}
        onChange={(e) => setValues((prev) => ({ ...prev, value: Number(e.target.value) }))}
      />
      {getFieldError(issues, 'value') && <p className="form-error">{getFieldError(issues, 'value')}</p>}

      {(values.type === 'PERCENTAGE' || values.type === 'ITEM_PERCENTAGE') && (
        <>
          <label htmlFor="maxDiscountAmount">Tope maximo de descuento (opcional)</label>
          <input
            id="maxDiscountAmount"
            type="number"
            value={values.maxDiscountAmount ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                maxDiscountAmount: e.target.value === '' ? undefined : Number(e.target.value),
              }))
            }
          />
        </>
      )}

      <label htmlFor="minOrderAmount">Monto minimo de compra (opcional)</label>
      <input
        id="minOrderAmount"
        type="number"
        value={values.minOrderAmount ?? ''}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, minOrderAmount: e.target.value === '' ? undefined : Number(e.target.value) }))
        }
      />

      <label htmlFor="maxUses">Usos maximos totales (opcional)</label>
      <input
        id="maxUses"
        type="number"
        value={values.maxUses ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, maxUses: e.target.value === '' ? undefined : Number(e.target.value) }))}
      />

      <label htmlFor="maxUsesPerUser">Usos maximos por cliente (opcional)</label>
      <input
        id="maxUsesPerUser"
        type="number"
        value={values.maxUsesPerUser ?? ''}
        onChange={(e) =>
          setValues((prev) => ({ ...prev, maxUsesPerUser: e.target.value === '' ? undefined : Number(e.target.value) }))
        }
      />

      <label htmlFor="validFrom">Vigente desde (opcional)</label>
      <input
        id="validFrom"
        type="date"
        value={values.validFrom ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, validFrom: e.target.value || undefined }))}
      />

      <label htmlFor="validUntil">Vigente hasta (opcional)</label>
      <input
        id="validUntil"
        type="date"
        value={values.validUntil ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, validUntil: e.target.value || undefined }))}
      />
      {getFieldError(issues, 'validUntil') && <p className="form-error">{getFieldError(issues, 'validUntil')}</p>}

      {showMerchFilters && (
        <>
          <label>Restringir a articulos (opcional, vacio = todo el carrito)</label>
          <div className="checkbox-list">
            {articulos.map((articulo) => (
              <label key={articulo.id} className="checkbox-list-item">
                <input
                  type="checkbox"
                  checked={(values.applicableItems ?? []).includes(articulo.id)}
                  onChange={() => toggleId('applicableItems', articulo.id)}
                />
                {articulo.nombre}
              </label>
            ))}
            {articulos.length === 0 && <p className="text-muted">No hay articulos cargados.</p>}
          </div>

          <label>Restringir a categorias (opcional)</label>
          <div className="checkbox-list">
            {categorias.map((categoria) => (
              <label key={categoria.id} className="checkbox-list-item">
                <input
                  type="checkbox"
                  checked={(values.applicableCategories ?? []).includes(categoria.id)}
                  onChange={() => toggleId('applicableCategories', categoria.id)}
                />
                {categoria.nombre}
              </label>
            ))}
            {categorias.length === 0 && <p className="text-muted">No hay categorias cargadas.</p>}
          </div>
        </>
      )}

      <label className="checkbox-list-item">
        <input
          type="checkbox"
          checked={values.isActive ?? true}
          onChange={(e) => setValues((prev) => ({ ...prev, isActive: e.target.checked }))}
        />
        Activo
      </label>

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
