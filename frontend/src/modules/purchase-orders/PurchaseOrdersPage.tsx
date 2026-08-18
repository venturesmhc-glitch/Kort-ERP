import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteOrdenCompraRequest, listOrdenesCompraRequest } from './purchase-orders.api';
import type { OrdenCompra, OrdenCompraEstado } from './purchase-orders.types';
import { listSuppliersRequest } from '../suppliers/suppliers.api';
import type { Supplier } from '../suppliers/suppliers.types';
import { formatCurrency } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/toast/ToastProvider';
import { PlanGate } from '../../components/PlanGate';

const ESTADOS: OrdenCompraEstado[] = ['BORRADOR', 'CONFIRMADA', 'ENVIADA', 'RECIBIDA'];

const ESTADO_LABEL: Record<OrdenCompraEstado, string> = {
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  ENVIADA: 'Enviada',
  RECIBIDA: 'Recibida',
};

function PurchaseOrdersPageContent() {
  const toast = useToast();
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<OrdenCompraEstado | ''>('');
  const [proveedorFiltro, setProveedorFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [ordenesData, suppliersData] = await Promise.all([
        listOrdenesCompraRequest({
          estado: estadoFiltro || undefined,
          proveedorId: proveedorFiltro || undefined,
        }),
        listSuppliersRequest(),
      ]);
      setOrdenes(ordenesData);
      setSuppliers(suppliersData);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar las ordenes de compra.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, proveedorFiltro]);

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta orden en borrador?')) return;
    try {
      await deleteOrdenCompraRequest(id);
      await load();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar la orden.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Ordenes de compra</h1>
      </div>
      <p className="text-muted">
        Las ordenes en borrador se generan automaticamente cuando un articulo cruza su stock
        minimo y tiene un proveedor cargado.
      </p>

      <div className="filters-row">
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value as OrdenCompraEstado | '')}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {ESTADO_LABEL[estado]}
            </option>
          ))}
        </select>
        <select value={proveedorFiltro} onChange={(e) => setProveedorFiltro(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.nombre}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Estado</th>
                <th>Items</th>
                <th>Total</th>
                <th>Creada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ordenes.map((orden) => (
                <tr key={orden.id}>
                  <td>{orden.proveedorNombre}</td>
                  <td>
                    <StatusBadge tone={orden.estado === 'BORRADOR' ? 'warning' : 'success'}>
                      {ESTADO_LABEL[orden.estado]}
                    </StatusBadge>
                  </td>
                  <td>{orden.items.length}</td>
                  <td>{formatCurrency(orden.total)}</td>
                  <td>{new Date(orden.createdAt).toLocaleDateString('es-AR')}</td>
                  <td className="data-table-actions">
                    <Link to={`/admin/ordenes-compra/${orden.id}`}>Ver / editar</Link>
                    {orden.estado === 'BORRADOR' && (
                      <button type="button" onClick={() => handleDelete(orden.id)}>
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {ordenes.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No hay ordenes de compra todavia." />
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

export function PurchaseOrdersPage() {
  return (
    <PlanGate feature="Las ordenes de compra">
      <PurchaseOrdersPageContent />
    </PlanGate>
  );
}
