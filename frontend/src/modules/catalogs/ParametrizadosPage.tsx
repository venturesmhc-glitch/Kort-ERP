import { useEffect, useState, type FormEvent } from 'react';
import {
  createCatalogItemRequest,
  createCategoryRequest,
  deleteCatalogItemRequest,
  deleteCategoryRequest,
  listCatalogItemsRequest,
  listCategoriesRequest,
  updateCatalogItemRequest,
} from './catalogs.api';
import { CatalogItemForm } from './CatalogItemForm';
import type { CatalogCategory, CatalogItem, CatalogKey } from './catalogs.types';
import type { CatalogItemFormValues } from './catalogs.schema';
import { ApiError } from '../../lib/apiClient';
import { formatCurrency } from '../../lib/format';
import { EmptyState, ErrorState, LoadingState, toErrorMessage } from '../../components/AsyncState';

const ACCENTED_CHARS: Record<string, string> = {
  a: 'aàáâãäå',
  e: 'eèéêë',
  i: 'iìíîï',
  o: 'oòóôõö',
  u: 'uùúûü',
  n: 'nñ',
  c: 'cç',
};

function slugify(value: string) {
  let normalized = value.toLowerCase();
  for (const [plain, accented] of Object.entries(ACCENTED_CHARS)) {
    for (const char of accented) {
      normalized = normalized.split(char).join(plain);
    }
  }
  return normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function ParametrizadosPage() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeKey, setActiveKey] = useState<CatalogKey | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadCategories(selectKey?: CatalogKey) {
    try {
      const list = await listCategoriesRequest();
      setCategories(list);
      const nextKey = selectKey ?? list[0]?.key ?? null;
      setActiveKey(nextKey);
    } catch (err) {
      setLoadError(toErrorMessage(err, 'No se pudieron cargar los catalogos.'));
    }
  }

  async function loadItems(key: CatalogKey) {
    setLoading(true);
    setLoadError(null);
    try {
      setItems(await listCatalogItemsRequest(key));
    } catch (err) {
      setLoadError(toErrorMessage(err, 'No se pudieron cargar los registros.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setShowForm(false);
    setEditingItem(null);
    if (activeKey) {
      loadItems(activeKey);
    }
  }, [activeKey]);

  const activeCategory = categories.find((c) => c.key === activeKey) ?? null;
  const showPrecio = activeKey === 'tipos-corte';

  async function handleCreate(values: CatalogItemFormValues) {
    if (!activeKey) return;
    await createCatalogItemRequest(activeKey, values);
    setShowForm(false);
    await loadItems(activeKey);
  }

  async function handleUpdate(values: CatalogItemFormValues) {
    if (!editingItem || !activeKey) return;
    await updateCatalogItemRequest(activeKey, editingItem.id, values);
    setEditingItem(null);
    await loadItems(activeKey);
  }

  async function handleDelete(id: string) {
    if (!activeKey || !confirm('¿Eliminar este registro del catalogo?')) return;
    await deleteCatalogItemRequest(activeKey, id);
    await loadItems(activeKey);
  }

  async function handleCreateCategory(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const key = slugify(newCategoryName);
    if (!key) {
      setError('El nombre del catalogo es requerido');
      return;
    }
    try {
      await createCategoryRequest({ key, name: newCategoryName });
      setNewCategoryName('');
      setShowCategoryForm(false);
      await loadCategories(key);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el catalogo');
    }
  }

  async function handleDeleteCategory() {
    if (!activeCategory || activeCategory.isSystem) return;
    if (!confirm(`¿Eliminar el catalogo "${activeCategory.name}"?`)) return;
    try {
      await deleteCategoryRequest(activeCategory.key);
      await loadCategories();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el catalogo');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Parametrizados</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeCategory && !activeCategory.isSystem && (
            <button type="button" onClick={handleDeleteCategory}>
              Eliminar catalogo
            </button>
          )}
          <button type="button" onClick={() => setShowCategoryForm((v) => !v)}>
            Nuevo catalogo
          </button>
          {!showForm && !editingItem && activeKey && (
            <button type="button" onClick={() => setShowForm(true)}>
              Nuevo registro
            </button>
          )}
        </div>
      </div>

      {showCategoryForm && (
        <form className="client-form" onSubmit={handleCreateCategory}>
          <label htmlFor="categoryName">Nombre del catalogo</label>
          <input
            id="categoryName"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Ej: Metodos de pago"
          />
          <div className="client-form-actions">
            <button type="button" onClick={() => setShowCategoryForm(false)}>
              Cancelar
            </button>
            <button type="submit">Crear</button>
          </div>
        </form>
      )}

      {error && <ErrorState message={error} />}
      {loadError && <ErrorState message={loadError} />}

      <div className="tabs">
        {categories.map((category) => (
          <button
            key={category.key}
            type="button"
            className={category.key === activeKey ? 'tab active' : 'tab'}
            onClick={() => setActiveKey(category.key)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {showForm && (
        <CatalogItemForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          showPrecio={showPrecio}
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
          showPrecio={showPrecio}
        />
      )}

      {loading ? (
        <LoadingState />
      ) : !loadError ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripcion</th>
                {showPrecio && <th>Precio</th>}
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.nombre}</td>
                  <td>{item.descripcion ?? '-'}</td>
                  {showPrecio && <td>{item.precio !== undefined ? formatCurrency(item.precio) : '-'}</td>}
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
                  <td colSpan={showPrecio ? 5 : 4}>
                    <EmptyState message="No hay registros en este catalogo todavia." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
