import { useEffect, useState, type FormEvent } from 'react';
import {
  ventaItemFormSchema,
  clienteVentaFormSchema,
  type VentaItemFormValues,
  type ClienteVentaFormValues,
} from './ventas.schema';
import { listPublicArticulosRequest } from '../articulos/articulos.api';
import type { Articulo } from '../articulos/articulos.types';
import { listClientsRequest } from '../clients/clients.api';
import type { Client } from '../clients/clients.types';
import { formatCurrency } from '../../lib/format';
import type { CrearVentaInput, CrearVentaItemInput } from './ventas.api';
import { useToast } from '../../components/toast/ToastProvider';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface CartLine extends CrearVentaItemInput {
  key: string;
  articuloNombre: string;
}

interface VentaFormProps {
  onSubmit: (values: CrearVentaInput) => Promise<void>;
  onCancel: () => void;
}

type ClienteModo = 'ninguno' | 'existente' | 'nuevo';

export function VentaForm({ onSubmit, onCancel }: VentaFormProps) {
  const toast = useToast();
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [itemValues, setItemValues] = useState<VentaItemFormValues>({
    articuloId: '',
    articuloNombre: '',
    cantidad: 1,
    precioUnitario: 0,
  });
  const [clienteModo, setClienteModo] = useState<ClienteModo>('ninguno');
  const [clienteId, setClienteId] = useState('');
  const [clienteNuevo, setClienteNuevo] = useState<ClienteVentaFormValues>({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [itemIssues, setItemIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [clienteIssues, setClienteIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listPublicArticulosRequest().then((items) => {
      const disponibles = items.filter((item) => item.stock > 0);
      setArticulos(disponibles);
      const first = disponibles[0];
      if (first) {
        setItemValues((prev) => ({
          ...prev,
          articuloId: first.id,
          articuloNombre: first.nombre,
          precioUnitario: first.precio,
        }));
      }
    });
    listClientsRequest()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const articuloSeleccionado = articulos.find((a) => a.id === itemValues.articuloId);
  const cantidadEnCarrito = cart
    .filter((line) => line.articuloId === itemValues.articuloId)
    .reduce((sum, line) => sum + line.cantidad, 0);
  const disponible = articuloSeleccionado ? articuloSeleccionado.stock - cantidadEnCarrito : 0;

  function handleAgregarItem() {
    setItemIssues(undefined);
    const parsed = ventaItemFormSchema.safeParse(itemValues);
    if (!parsed.success) {
      setItemIssues(parsed.error.issues);
      return;
    }
    if (parsed.data.cantidad > disponible) {
      setItemIssues([{ path: ['cantidad'], message: `Stock insuficiente (disponible: ${disponible})` }]);
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        key: `${parsed.data.articuloId}-${Date.now()}`,
        articuloId: parsed.data.articuloId,
        articuloNombre: parsed.data.articuloNombre,
        cantidad: parsed.data.cantidad,
        precioUnitario: parsed.data.precioUnitario,
      },
    ]);
    setItemValues((prev) => ({ ...prev, cantidad: 1 }));
  }

  function handleQuitarItem(key: string) {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }

  const total = cart.reduce((sum, line) => sum + line.cantidad * line.precioUnitario, 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setClienteIssues(undefined);

    if (cart.length === 0) {
      toast.error('Agrega al menos un articulo al carrito');
      return;
    }

    let clienteNuevoPayload: ClienteVentaFormValues | undefined;
    if (clienteModo === 'nuevo') {
      const parsedCliente = clienteVentaFormSchema.safeParse(clienteNuevo);
      if (!parsedCliente.success) {
        setClienteIssues(parsedCliente.error.issues);
        return;
      }
      clienteNuevoPayload = parsedCliente.data;
    }
    if (clienteModo === 'existente' && !clienteId) {
      toast.error('Selecciona un cliente');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        items: cart.map(({ articuloId, cantidad, precioUnitario }) => ({
          articuloId,
          cantidad,
          precioUnitario,
        })),
        clienteId: clienteModo === 'existente' ? clienteId : undefined,
        clienteNuevo: clienteNuevoPayload,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar la venta'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <h3>Agregar articulo</h3>
      <label htmlFor="articulo">Articulo</label>
      <select
        id="articulo"
        value={itemValues.articuloId}
        onChange={(e) => {
          const articulo = articulos.find((a) => a.id === e.target.value);
          setItemValues((prev) => ({
            ...prev,
            articuloId: e.target.value,
            articuloNombre: articulo?.nombre ?? '',
            precioUnitario: articulo?.precio ?? 0,
          }));
        }}
      >
        {articulos.length === 0 && <option value="">Sin stock disponible</option>}
        {articulos.map((articulo) => (
          <option key={articulo.id} value={articulo.id}>
            {articulo.nombre} (stock: {articulo.stock})
          </option>
        ))}
      </select>
      {getFieldError(itemIssues, 'articuloId') && (
        <p className="form-error">{getFieldError(itemIssues, 'articuloId')}</p>
      )}

      <label htmlFor="cantidad">Cantidad</label>
      <input
        id="cantidad"
        type="number"
        min="1"
        step="1"
        value={itemValues.cantidad}
        onChange={(e) => setItemValues((prev) => ({ ...prev, cantidad: Number(e.target.value) }))}
      />
      {getFieldError(itemIssues, 'cantidad') && (
        <p className="form-error">{getFieldError(itemIssues, 'cantidad')}</p>
      )}

      <label htmlFor="precioUnitario">Precio unitario</label>
      <input
        id="precioUnitario"
        type="number"
        min="0"
        step="0.01"
        value={itemValues.precioUnitario}
        onChange={(e) => setItemValues((prev) => ({ ...prev, precioUnitario: Number(e.target.value) }))}
      />
      {getFieldError(itemIssues, 'precioUnitario') && (
        <p className="form-error">{getFieldError(itemIssues, 'precioUnitario')}</p>
      )}

      <button type="button" onClick={handleAgregarItem} disabled={articulos.length === 0}>
        Agregar al carrito
      </button>

      {cart.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Articulo</th>
                <th>Cantidad</th>
                <th>Precio unit.</th>
                <th>Subtotal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.key}>
                  <td>{line.articuloNombre}</td>
                  <td>{line.cantidad}</td>
                  <td>{formatCurrency(line.precioUnitario)}</td>
                  <td>{formatCurrency(line.cantidad * line.precioUnitario)}</td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => handleQuitarItem(line.key)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p>
        Total del carrito: <strong>{formatCurrency(total)}</strong>
      </p>

      <h3>Cliente (opcional)</h3>
      <label htmlFor="clienteModo">Asociar cliente</label>
      <select id="clienteModo" value={clienteModo} onChange={(e) => setClienteModo(e.target.value as ClienteModo)}>
        <option value="ninguno">Venta de mostrador (sin cliente)</option>
        <option value="existente">Cliente existente</option>
        <option value="nuevo">Cliente nuevo (por telefono)</option>
      </select>

      {clienteModo === 'existente' && (
        <>
          <label htmlFor="clienteExistente">Cliente</label>
          <select id="clienteExistente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Seleccionar...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName} · {client.phone}
              </option>
            ))}
          </select>
        </>
      )}

      {clienteModo === 'nuevo' && (
        <>
          <label htmlFor="clienteNombre">Nombre</label>
          <input
            id="clienteNombre"
            value={clienteNuevo.firstName}
            onChange={(e) => setClienteNuevo((prev) => ({ ...prev, firstName: e.target.value }))}
          />
          {getFieldError(clienteIssues, 'firstName') && (
            <p className="form-error">{getFieldError(clienteIssues, 'firstName')}</p>
          )}
          <label htmlFor="clienteApellido">Apellido</label>
          <input
            id="clienteApellido"
            value={clienteNuevo.lastName}
            onChange={(e) => setClienteNuevo((prev) => ({ ...prev, lastName: e.target.value }))}
          />
          {getFieldError(clienteIssues, 'lastName') && (
            <p className="form-error">{getFieldError(clienteIssues, 'lastName')}</p>
          )}
          <label htmlFor="clienteTelefono">Telefono</label>
          <input
            id="clienteTelefono"
            value={clienteNuevo.phone}
            onChange={(e) => setClienteNuevo((prev) => ({ ...prev, phone: e.target.value }))}
          />
          {getFieldError(clienteIssues, 'phone') && (
            <p className="form-error">{getFieldError(clienteIssues, 'phone')}</p>
          )}
        </>
      )}

      <div className="client-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" disabled={saving || cart.length === 0}>
          {saving ? 'Confirmando...' : 'Confirmar venta'}
        </button>
      </div>
    </form>
  );
}
