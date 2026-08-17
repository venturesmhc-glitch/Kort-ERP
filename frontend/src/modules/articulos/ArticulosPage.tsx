import { useEffect, useState } from 'react';
import {
  createArticuloRequest,
  deleteArticuloRequest,
  listArticulosRequest,
  updateArticuloRequest,
} from './articulos.api';
import { ArticuloForm } from './ArticuloForm';
import type { Articulo } from './articulos.types';
import type { ArticuloFormValues } from './articulos.schema';
import { formatCurrency } from '../../lib/format';

export function ArticulosPage() {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function loadArticulos() {
    setLoading(true);
    try {
      setArticulos(await listArticulosRequest());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticulos();
  }, []);

  async function handleCreate(values: ArticuloFormValues) {
    await createArticuloRequest(values);
    setShowForm(false);
    await loadArticulos();
  }

  async function handleUpdate(values: ArticuloFormValues) {
    if (!editingArticulo) return;
    await updateArticuloRequest(editingArticulo.id, values);
    setEditingArticulo(null);
    await loadArticulos();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este articulo?')) return;
    await deleteArticuloRequest(id);
    await loadArticulos();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Articulos y stock</h1>
        {!showForm && !editingArticulo && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo articulo
          </button>
        )}
      </div>

      {showForm && <ArticuloForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {editingArticulo && (
        <ArticuloForm
          initialValues={{
            nombre: editingArticulo.nombre,
            tipoProductoId: editingArticulo.tipoProductoId,
            tipoProductoNombre: editingArticulo.tipoProductoNombre,
            precio: editingArticulo.precio,
            stock: editingArticulo.stock,
            imagenUrl: editingArticulo.imagenUrl ?? '',
          }}
          onSubmit={handleUpdate}
          onCancel={() => setEditingArticulo(null)}
        />
      )}

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Precio</th>
                <th>Stock</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articulos.map((articulo) => (
                <tr key={articulo.id}>
                  <td>
                    {articulo.imagenUrl ? (
                      <img src={articulo.imagenUrl} alt={articulo.nombre} className="row-thumb" />
                    ) : (
                      <span className="row-thumb row-thumb-empty">Sin img.</span>
                    )}
                  </td>
                  <td>{articulo.nombre}</td>
                  <td>{articulo.tipoProductoNombre}</td>
                  <td>{formatCurrency(articulo.precio)}</td>
                  <td>
                    <span className={articulo.stock <= 5 ? 'badge badge-warning' : 'badge badge-success'}>
                      {articulo.stock}
                    </span>
                  </td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => setEditingArticulo(articulo)}>
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(articulo.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {articulos.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay articulos cargados todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
