import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { crearVentaRequest } from '../ventas/ventas.api';
import type { CartItem } from './store.types';
import { formatCurrency } from '../../lib/format';

export function StorePage() {
  const [searchParams] = useSearchParams();
  const vieneDeTurno = searchParams.get('turno') === '1';

  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [tipos, setTipos] = useState<CatalogItem[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadArticulos() {
    setLoading(true);
    try {
      const [articulosData, tiposData] = await Promise.all([
        listArticulosRequest(),
        listActiveCatalogItemsRequest('tipos-producto'),
      ]);
      setArticulos(articulosData);
      setTipos(tiposData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArticulos();
  }, []);

  const articulosVisibles = articulos.filter(
    (a) => filtroTipo === 'todos' || a.tipoProductoId === filtroTipo
  );

  function addToCart(articulo: Articulo) {
    setCart((prev) => {
      const existing = prev.find((item) => item.articuloId === articulo.id);
      if (existing) {
        if (existing.cantidad >= articulo.stock) return prev;
        return prev.map((item) =>
          item.articuloId === articulo.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          articuloId: articulo.id,
          nombre: articulo.nombre,
          precio: articulo.precio,
          cantidad: 1,
          stockDisponible: articulo.stock,
        },
      ];
    });
  }

  function changeQuantity(articuloId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.articuloId === articuloId
            ? { ...item, cantidad: Math.min(item.stockDisponible, Math.max(0, item.cantidad + delta)) }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  const total = cart.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  async function handleConfirmarReserva() {
    setError(null);
    setConfirming(true);
    try {
      for (const item of cart) {
        await crearVentaRequest({
          articuloId: item.articuloId,
          articuloNombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        });
      }
      setCart([]);
      setConfirmado(true);
      await loadArticulos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la reserva');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Tienda de merchandising</h1>
      </div>

      {vieneDeTurno && (
        <div className="card store-banner">
          <p>Ya elegiste barbero, horario y tipo de corte.</p>
          <Link to="/turnos?resume=1" className="button-secondary">
            Volver a completar tu turno
          </Link>
        </div>
      )}

      {confirmado && (
        <div className="card">
          <p>¡Reserva confirmada! El stock quedo reservado para retirar en tu proximo turno.</p>
        </div>
      )}

      <div className="tabs">
        <button
          type="button"
          className={filtroTipo === 'todos' ? 'tab active' : 'tab'}
          onClick={() => setFiltroTipo('todos')}
        >
          Todos
        </button>
        {tipos.map((tipo) => (
          <button
            key={tipo.id}
            type="button"
            className={filtroTipo === tipo.id ? 'tab active' : 'tab'}
            onClick={() => setFiltroTipo(tipo.id)}
          >
            {tipo.nombre}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="store-layout">
          <div className="card-grid">
            {articulosVisibles.map((articulo) => (
              <div className="card product-card" key={articulo.id}>
                {articulo.imagenUrl ? (
                  <img src={articulo.imagenUrl} alt={articulo.nombre} className="product-image" />
                ) : (
                  <div className="product-image product-image-empty">Sin imagen</div>
                )}
                <h3>{articulo.nombre}</h3>
                <p className="text-muted">{articulo.tipoProductoNombre}</p>
                <p className="product-price">{formatCurrency(articulo.precio)}</p>
                <button
                  type="button"
                  disabled={articulo.stock === 0}
                  onClick={() => addToCart(articulo)}
                >
                  {articulo.stock === 0 ? 'Sin stock' : 'Agregar al carrito'}
                </button>
              </div>
            ))}
            {articulosVisibles.length === 0 && <p className="text-muted">No hay articulos en esta categoria.</p>}
          </div>

          <aside className="cart">
            <h2>Carrito</h2>
            {cart.length === 0 ? (
              <p className="text-muted">Todavia no agregaste productos.</p>
            ) : (
              <ul className="cart-items">
                {cart.map((item) => (
                  <li key={item.articuloId} className="cart-item">
                    <span>{item.nombre}</span>
                    <div className="cart-item-qty">
                      <button type="button" onClick={() => changeQuantity(item.articuloId, -1)}>
                        -
                      </button>
                      <span>{item.cantidad}</span>
                      <button type="button" onClick={() => changeQuantity(item.articuloId, 1)}>
                        +
                      </button>
                    </div>
                    <span>{formatCurrency(item.precio * item.cantidad)}</span>
                  </li>
                ))}
              </ul>
            )}

            <p className="cart-total">Total: {formatCurrency(total)}</p>

            {error && <p className="form-error">{error}</p>}

            <button
              type="button"
              disabled={cart.length === 0 || confirming}
              onClick={handleConfirmarReserva}
            >
              {confirming ? 'Confirmando...' : 'Confirmar reserva'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
