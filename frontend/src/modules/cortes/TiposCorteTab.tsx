import { useEffect, useState } from 'react';
import {
  createCatalogItemRequest,
  deleteCatalogItemRequest,
  listCatalogItemsRequest,
  updateCatalogItemRequest,
} from '../catalogs/catalogs.api';
import { CatalogItemForm } from '../catalogs/CatalogItemForm';
import type { CatalogItem } from '../catalogs/catalogs.types';
import type { CatalogItemFormValues } from '../catalogs/catalogs.schema';
import { formatCurrency } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/toast/ToastProvider';
import { getErrorMessage } from '../../lib/apiErrors';

const CATALOG_KEY = 'tipos-corte';

export function TiposCorteTab() {
  const toast = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  async function loadItems() {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await listCatalogItemsRequest(CATALOG_KEY));
    } catch (err) {
      setLoadError(toErrorMessage(err, 'No se pudieron cargar los tipos de corte.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleCreate(values: CatalogItemFormValues) {
    await createCatalogItemRequest(CATALOG_KEY, values);
    setShowForm(false);
    await loadItems();
  }

  async function handleUpdate(values: CatalogItemFormValues) {
    if (!editingItem) return;
    await updateCatalogItemRequest(CATALOG_KEY, editingItem.id, values);
    setEditingItem(null);
    await loadItems();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este tipo de corte?')) return;
    try {
      await deleteCatalogItemRequest(CATALOG_KEY, id);
      await loadItems();
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar el tipo de corte.'));
    }
  }

  return (
    <div>
      <div className="page-header">
        {!showForm && !editingItem && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo tipo de corte
          </button>
        )}
      </div>

      {showForm && (
        <CatalogItemForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          showPrecio
          hideDescripcion
        />
      )}

      {editingItem && (
        <CatalogItemForm
          initialValues={{
            nombre: editingItem.nombre,
            descripcion: editingItem.descripcion ?? '',
            activo: editingItem.activo,
            precio: editingItem.precio,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingItem(null)}
          showPrecio
          hideDescripcion
        />
      )}

      {loading ? (
        <PageSkeleton />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.precio !== undefined ? formatCurrency(item.precio) : '-'}</td>
                  <td>
                    <StatusBadge tone={item.activo ? 'success' : 'muted'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </StatusBadge>
                  </td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => setEditingItem(item)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(item.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState message="No hay tipos de corte cargados todavia." />
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
