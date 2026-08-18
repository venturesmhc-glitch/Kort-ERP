import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  confirmOrdenCompraRequest,
  getOrdenCompraRequest,
  receiveOrdenCompraRequest,
  sendOrdenCompraRequest,
  updateOrdenCompraRequest,
} from './purchase-orders.api';
import type { OrdenCompra } from './purchase-orders.types';
import { listArticlesCatalogRequest, listSuppliersRequest, type ArticleCatalogItem } from '../suppliers/suppliers.api';
import type { Supplier } from '../suppliers/suppliers.types';
import { formatCurrency } from '../../lib/format';
import { ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { PlanGate } from '../../components/PlanGate';

interface EditableItem {
  articleId: string;
  cantidad: number;
  precioUnitario: number;
}

function PurchaseOrderDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [orden, setOrden] = useState<OrdenCompra | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [articulos, setArticulos] = useState<ArticleCatalogItem[]>([]);
  const [proveedorId, setProveedorId] = useState('');
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [ordenData, suppliersData, articulosData] = await Promise.all([
        getOrdenCompraRequest(id),
        listSuppliersRequest(),
        listArticlesCatalogRequest(),
      ]);
      setOrden(ordenData);
      setSuppliers(suppliersData);
      setArticulos(articulosData);
      setProveedorId(ordenData.proveedorId);
      setItems(
        ordenData.items.map((item) => ({
          articleId: item.articleId,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
        }))
      );
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudo cargar la orden de compra.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function updateItem(index: number, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    const first = articulos[0];
    if (!first) return;
    setItems((prev) => [...prev, { articleId: first.id, cantidad: 1, precioUnitario: 0 }]);
  }

  async function handleSave() {
    if (!id) return;
    if (items.length === 0) {
      toast.error('La orden debe tener al menos un producto');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateOrdenCompraRequest(id, { proveedorId, items });
      setOrden(updated);
      toast.success('Orden actualizada');
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo guardar la orden.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTransition(action: () => Promise<OrdenCompra>) {
    setSaving(true);
    try {
      const updated = await action();
      setOrden(updated);
      toast.success('Orden actualizada');
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo actualizar la orden.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (error || !orden) return <ErrorState message={error ?? 'Orden no encontrada'} />;

  const isBorrador = orden.estado === 'BORRADOR';
  const total = items.reduce((sum, item) => sum + item.cantidad * item.precioUnitario, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Orden de compra</h1>
        <button type="button" onClick={() => navigate('/admin/ordenes-compra')}>
          Volver
        </button>
      </div>

      <div className="card">
        <p>
          Estado: <strong>{orden.estado}</strong>
        </p>

        <label htmlFor="proveedor">Proveedor</label>
        <select
          id="proveedor"
          value={proveedorId}
          disabled={!isBorrador}
          onChange={(e) => setProveedorId(e.target.value)}
        >
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.nombre}
            </option>
          ))}
        </select>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Articulo</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Subtotal</th>
                {isBorrador && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    {isBorrador ? (
                      <select
                        value={item.articleId}
                        onChange={(e) => updateItem(index, { articleId: e.target.value })}
                      >
                        {articulos.map((articulo) => (
                          <option key={articulo.id} value={articulo.id}>
                            {articulo.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      orden.items.find((i) => i.articleId === item.articleId)?.articleNombre ?? item.articleId
                    )}
                  </td>
                  <td>
                    {isBorrador ? (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.cantidad}
                        onChange={(e) => updateItem(index, { cantidad: Number(e.target.value) })}
                      />
                    ) : (
                      item.cantidad
                    )}
                  </td>
                  <td>
                    {isBorrador ? (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.precioUnitario}
                        onChange={(e) => updateItem(index, { precioUnitario: Number(e.target.value) })}
                      />
                    ) : (
                      formatCurrency(item.precioUnitario)
                    )}
                  </td>
                  <td>{formatCurrency(item.cantidad * item.precioUnitario)}</td>
                  {isBorrador && (
                    <td>
                      <button type="button" onClick={() => removeItem(index)}>
                        Quitar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isBorrador && (
          <button type="button" onClick={addItem} disabled={articulos.length === 0}>
            Agregar producto
          </button>
        )}

        <p>
          <strong>Total: {formatCurrency(total)}</strong>
        </p>

        <div className="client-form-actions">
          {isBorrador && (
            <>
              <button type="button" onClick={handleSave} disabled={saving}>
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={() => handleTransition(() => confirmOrdenCompraRequest(orden.id))}
                disabled={saving}
              >
                Confirmar orden
              </button>
            </>
          )}
          {orden.estado === 'CONFIRMADA' && (
            <button
              type="button"
              onClick={() => handleTransition(() => sendOrdenCompraRequest(orden.id))}
              disabled={saving}
            >
              Marcar como enviada
            </button>
          )}
          {orden.estado === 'ENVIADA' && (
            <button
              type="button"
              onClick={() => handleTransition(() => receiveOrdenCompraRequest(orden.id))}
              disabled={saving}
            >
              Marcar como recibida (da de alta el stock)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PurchaseOrderDetailPage() {
  return (
    <PlanGate feature="Las ordenes de compra">
      <PurchaseOrderDetailPageContent />
    </PlanGate>
  );
}
