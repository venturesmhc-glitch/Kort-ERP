import { Fragment, useEffect, useState } from 'react';
import {
  createSupplierRequest,
  deleteSupplierRequest,
  listSuppliersRequest,
  updateSupplierRequest,
} from './suppliers.api';
import { SupplierForm } from './SupplierForm';
import { SupplierProductsPanel } from './SupplierProductsPanel';
import type { Supplier } from './suppliers.types';
import type { SupplierFormValues } from './suppliers.schema';
import { EmptyState, ErrorState, LoadingState, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { PlanGate } from '../../components/PlanGate';

function SuppliersPageContent() {
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [productsSupplierId, setProductsSupplierId] = useState<string | null>(null);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);
    try {
      setSuppliers(await listSuppliersRequest());
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los proveedores.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleCreate(values: SupplierFormValues) {
    await createSupplierRequest(values);
    setShowForm(false);
    await loadSuppliers();
  }

  async function handleUpdate(values: SupplierFormValues) {
    if (!editingSupplier) return;
    await updateSupplierRequest(editingSupplier.id, values);
    setEditingSupplier(null);
    await loadSuppliers();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try {
      await deleteSupplierRequest(id);
      await loadSuppliers();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el proveedor.'));
    }
  }

  const productsSupplier = suppliers.find((s) => s.id === productsSupplierId) ?? null;

  return (
    <div>
      <div className="page-header">
        <h1>Proveedores</h1>
        {!showForm && !editingSupplier && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo proveedor
          </button>
        )}
      </div>

      {showForm && <SupplierForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {editingSupplier && (
        <SupplierForm
          initialValues={{
            nombre: editingSupplier.nombre,
            contacto: editingSupplier.contacto ?? '',
            telefono: editingSupplier.telefono ?? '',
            email: editingSupplier.email ?? '',
            condicionesPago: editingSupplier.condicionesPago ?? '',
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingSupplier(null)}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Telefono</th>
                <th>Productos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <Fragment key={supplier.id}>
                  <tr>
                    <td>{supplier.nombre}</td>
                    <td>{supplier.contacto ?? '-'}</td>
                    <td>{supplier.telefono ?? '-'}</td>
                    <td>{supplier.productos.length}</td>
                    <td className="data-table-actions">
                      <button
                        type="button"
                        onClick={() =>
                          setProductsSupplierId(productsSupplierId === supplier.id ? null : supplier.id)
                        }
                      >
                        {productsSupplierId === supplier.id ? 'Ocultar productos' : 'Productos'}
                      </button>
                      <button type="button" onClick={() => setEditingSupplier(supplier)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDelete(supplier.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                  {productsSupplier?.id === supplier.id && (
                    <tr>
                      <td colSpan={5}>
                        <SupplierProductsPanel supplier={productsSupplier} onChanged={loadSuppliers} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EmptyState message="No hay proveedores cargados todavia." />
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

export function SuppliersPage() {
  return (
    <PlanGate feature="El modulo de Proveedores">
      <SuppliersPageContent />
    </PlanGate>
  );
}
