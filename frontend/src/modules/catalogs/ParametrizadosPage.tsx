import { useEffect, useState } from 'react';
import {
  createCatalogItemRequest,
  deleteCatalogItemRequest,
  listCatalogItemsRequest,
  updateCatalogItemRequest,
} from './catalogs.api';
import { CatalogItemForm } from './CatalogItemForm';
import { CATALOG_KEYS, CATALOG_LABELS, type CatalogItem, type CatalogKey } from './catalogs.types';
import type { CatalogItemFormValues } from './catalogs.schema';

export function ParametrizadosPage() {
  const [activeKey, setActiveKey] = useState<CatalogKey>(CATALOG_KEYS[0]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadItems(key: CatalogKey) {
    setLoading(true);
    try {
      setItems(await listCatalogItemsRequest(key));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setShowForm(false);
    setEditingItem(null);
    loadItems(activeKey);
  }, [activeKey]);

  async function handleCreate(values: CatalogItemFormValues) {
    await createCatalogItemRequest(activeKey, values);
    setShowForm(false);
    await loadItems(activeKey);
  }

  async function handleUpdate(values: CatalogItemFormValues) {
    if (!editingItem) return;
    await updateCatalogItemRequest(activeKey, editingItem.id, values);
    setEditingItem(null);
    await loadItems(activeKey);
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este registro del catalogo?')) return;
    await deleteCatalogItemRequest(activeKey, id);
    await loadItems(activeKey);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Parametrizados</h1>
        {!showForm && !editingItem && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo registro
          </button>
        )}
      </div>

      <div className="tabs">
        {CATALOG_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className={key === activeKey ? 'tab active' : 'tab'}
            onClick={() => setActiveKey(key)}
          >
            {CATALOG_LABELS[key]}
          </button>
        ))}
      </div>

      {showForm && (
        <CatalogItemForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {editingItem && (
        <CatalogItemForm
          initialValues={{
            nombre: editingItem.nombre,
            descripcion: editingItem.descripcion ?? '',
            activo: editingItem.activo,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingItem(null)}
        />
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.descripcion ?? '-'}</td>
                  <td>
                    <span className={item.activo ? 'badge badge-success' : 'badge badge-muted'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </span>
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
                  <td colSpan={4}>No hay registros en este catalogo todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
