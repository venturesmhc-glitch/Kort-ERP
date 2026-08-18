import { useEffect, useState } from 'react';
import {
  createArticuloRequest,
  crearMovimientoRequest,
  deleteArticuloRequest,
  listArticulosRequest,
  updateArticuloRequest,
  uploadImagenRequest,
} from './articulos.api';
import { ArticuloForm } from './ArticuloForm';
import { StockMovementForm } from './StockMovementForm';
import { nivelStock, type Articulo } from './articulos.types';
import type { ArticuloFormValues, MovimientoFormValues } from './articulos.schema';
import { formatCurrency } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';
import { StatusBadge } from '../../components/StatusBadge';
import { useToast } from '../../components/toast/ToastProvider';

export function ArticulosPage() {
  const toast = useToast();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingArticulo, setEditingArticulo] = useState<Articulo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [movementArticulo, setMovementArticulo] = useState<Articulo | null>(null);

  async function loadArticulos() {
    setLoading(true);
    setError(null);
    try {
      setArticulos(await listArticulosRequest());
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los articulos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticulos();
  }, []);

  async function handleCreate(values: ArticuloFormValues, imagenFile: File | null) {
    const articulo = await createArticuloRequest(values);
    if (imagenFile) {
      await uploadImagenRequest(articulo.id, imagenFile);
    }
    setShowForm(false);
    await loadArticulos();
  }

  async function handleUpdate(values: ArticuloFormValues, imagenFile: File | null) {
    if (!editingArticulo) return;
    await updateArticuloRequest(editingArticulo.id, values);
    if (imagenFile) {
      await uploadImagenRequest(editingArticulo.id, imagenFile);
    }
    setEditingArticulo(null);
    await loadArticulos();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este articulo?')) return;
    try {
      await deleteArticuloRequest(id);
      await loadArticulos();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el articulo.'));
    }
  }

  async function handleMovement(values: MovimientoFormValues) {
    if (!movementArticulo) return;
    await crearMovimientoRequest(movementArticulo.id, values);
    setMovementArticulo(null);
    await loadArticulos();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Articulos y stock</h1>
        {!showForm && !editingArticulo && !movementArticulo && (
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
            descripcion: editingArticulo.descripcion ?? '',
            tipoProductoId: editingArticulo.tipoProductoId,
            tipoProductoNombre: editingArticulo.tipoProductoNombre,
            precio: editingArticulo.precio,
            stockMinimo: editingArticulo.stockMinimo,
            stockCritico: editingArticulo.stockCritico,
          }}
          initialImagenUrl={editingArticulo.imagenUrl}
          onSubmit={handleUpdate}
          onCancel={() => setEditingArticulo(null)}
        />
      )}

      {movementArticulo && (
        <StockMovementForm
          articulo={movementArticulo}
          onSubmit={handleMovement}
          onCancel={() => setMovementArticulo(null)}
        />
      )}

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap table-wrap--cards">
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
                  <td data-label="">
                    {articulo.imagenUrl ? (
                      <img src={articulo.imagenUrl} alt={articulo.nombre} className="row-thumb" />
                    ) : (
                      <span className="row-thumb row-thumb-empty">Sin img.</span>
                    )}
                  </td>
                  <td data-label="Nombre">{articulo.nombre}</td>
                  <td data-label="Tipo">{articulo.tipoProductoNombre}</td>
                  <td data-label="Precio">{formatCurrency(articulo.precio)}</td>
                  <td data-label="Stock">
                    <StatusBadge
                      tone={
                        nivelStock(articulo) === 'critico'
                          ? 'danger'
                          : nivelStock(articulo) === 'bajo'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {articulo.stock}
                    </StatusBadge>
                  </td>
                  <td className="data-table-actions" data-label="">
                    <button type="button" onClick={() => setMovementArticulo(articulo)}>
                      Movimiento
                    </button>
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
                  <td colSpan={6} data-label="">
                    <EmptyState message="No hay articulos cargados todavia." />
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
