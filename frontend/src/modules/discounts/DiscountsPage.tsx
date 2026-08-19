import { useEffect, useState } from 'react';
import { createDiscountRequest, deleteDiscountRequest, listDiscountsRequest, updateDiscountRequest } from './discounts.api';
import { DiscountForm } from './DiscountForm';
import { DISCOUNT_SCOPE_OPTIONS, DISCOUNT_TYPE_OPTIONS } from './discounts.schema';
import type { Discount } from './discounts.types';
import type { DiscountFormValues } from './discounts.schema';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { formatCurrency } from '../../lib/format';

function typeLabel(type: Discount['type']) {
  return DISCOUNT_TYPE_OPTIONS.find((opt) => opt.value === type)?.label ?? type;
}

function scopeLabel(scope: Discount['scope']) {
  return DISCOUNT_SCOPE_OPTIONS.find((opt) => opt.value === scope)?.label ?? scope;
}

function valueLabel(discount: Discount) {
  const isPercentage = discount.type === 'PERCENTAGE' || discount.type === 'ITEM_PERCENTAGE';
  return isPercentage ? `${discount.value}%` : formatCurrency(discount.value);
}

function toFormValues(discount: Discount): DiscountFormValues {
  return {
    code: discount.code,
    name: discount.name,
    type: discount.type,
    scope: discount.scope,
    value: discount.value,
    maxDiscountAmount: discount.maxDiscountAmount,
    minOrderAmount: discount.minOrderAmount,
    maxUses: discount.maxUses,
    maxUsesPerUser: discount.maxUsesPerUser,
    applicableItems: discount.applicableItems,
    applicableCategories: discount.applicableCategories,
    validFrom: discount.validFrom?.slice(0, 10),
    validUntil: discount.validUntil?.slice(0, 10),
    isActive: discount.isActive,
  };
}

export function DiscountsPage() {
  const toast = useToast();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadDiscounts() {
    setLoading(true);
    setError(null);
    try {
      setDiscounts(await listDiscountsRequest());
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los cupones.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDiscounts();
  }, []);

  async function handleCreate(values: DiscountFormValues) {
    await createDiscountRequest(values);
    setShowForm(false);
    await loadDiscounts();
  }

  async function handleUpdate(values: DiscountFormValues) {
    if (!editingDiscount) return;
    await updateDiscountRequest(editingDiscount.id, values);
    setEditingDiscount(null);
    await loadDiscounts();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este cupon?')) return;
    try {
      await deleteDiscountRequest(id);
      await loadDiscounts();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el cupon.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Descuentos</h1>
        {!showForm && !editingDiscount && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo cupon
          </button>
        )}
      </div>

      {showForm && <DiscountForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {editingDiscount && (
        <DiscountForm
          initialValues={toFormValues(editingDiscount)}
          onSubmit={handleUpdate}
          onCancel={() => setEditingDiscount(null)}
        />
      )}

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Aplica a</th>
                <th>Valor</th>
                <th>Usos</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {discounts.map((discount) => (
                <tr key={discount.id}>
                  <td>{discount.code}</td>
                  <td>{discount.name}</td>
                  <td>{typeLabel(discount.type)}</td>
                  <td>{scopeLabel(discount.scope)}</td>
                  <td>{valueLabel(discount)}</td>
                  <td>
                    {discount.usesCount}
                    {discount.maxUses ? ` / ${discount.maxUses}` : ''}
                  </td>
                  <td>{discount.isActive ? 'Activo' : 'Inactivo'}</td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => setEditingDiscount(discount)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(discount.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {discounts.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No hay cupones cargados todavia." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
