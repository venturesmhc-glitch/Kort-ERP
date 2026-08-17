import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { corteFormSchema, type CorteFormValues } from './cortes.schema';
import { listBarberosRequest } from '../users/users.api';
import type { AppUser } from '../users/users.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { listClientsRequest } from '../clients/clients.api';
import type { Client } from '../clients/clients.types';
import { readFileAsDataUrl } from '../../lib/mockStore';
import { todayIso } from '../../lib/format';

interface CorteFormProps {
  onSubmit: (values: CorteFormValues) => Promise<void>;
  onCancel: () => void;
}

const TODAY = todayIso();

export function CorteForm({ onSubmit, onCancel }: CorteFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [barberos, setBarberos] = useState<AppUser[]>([]);
  const [tiposCorte, setTiposCorte] = useState<CatalogItem[]>([]);
  const [values, setValues] = useState<CorteFormValues>({
    clienteNombre: '',
    clienteTelefono: '',
    barberoId: '',
    barberoNombre: '',
    tipoCorteId: '',
    tipoCorteNombre: '',
    precio: 0,
    fecha: TODAY,
    imagenUrl: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Se cargan por separado (no con Promise.all) para que si el backend real de
    // Clientes todavia no esta levantado, los selects de barbero y tipo de corte
    // (100% mock) sigan funcionando igual.
    listClientsRequest()
      .then((clientsData) => {
        setClients(clientsData);
        const first = clientsData[0];
        if (first) {
          setValues((prev) => ({
            ...prev,
            clienteNombre: `${first.firstName} ${first.lastName}`,
            clienteTelefono: first.phone,
          }));
        }
      })
      .catch(() => setClients([]));

    listBarberosRequest().then((barberosData) => {
      setBarberos(barberosData);
      const first = barberosData[0];
      if (first) {
        setValues((prev) => ({
          ...prev,
          barberoId: first.id,
          barberoNombre: `${first.firstName} ${first.lastName}`,
        }));
      }
    });

    listActiveCatalogItemsRequest('tipos-corte').then((tiposData) => {
      setTiposCorte(tiposData);
      const first = tiposData[0];
      if (first) {
        setValues((prev) => ({ ...prev, tipoCorteId: first.id, tipoCorteNombre: first.nombre }));
      }
    });
  }, []);

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setValues((prev) => ({ ...prev, imagenUrl: dataUrl }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = corteFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Datos invalidos');
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el corte');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
      <label htmlFor="cliente">Cliente</label>
      <select
        id="cliente"
        value={values.clienteTelefono}
        onChange={(e) => {
          const client = clients.find((c) => c.phone === e.target.value);
          setValues((prev) => ({
            ...prev,
            clienteTelefono: e.target.value,
            clienteNombre: client ? `${client.firstName} ${client.lastName}` : '',
          }));
        }}
      >
        {clients.length === 0 && <option value="">Sin clientes cargados</option>}
        {clients.map((client) => (
          <option key={client.id} value={client.phone}>
            {client.firstName} {client.lastName}
          </option>
        ))}
      </select>

      <label htmlFor="barbero">Barbero</label>
      <select
        id="barbero"
        value={values.barberoId}
        onChange={(e) => {
          const barbero = barberos.find((b) => b.id === e.target.value);
          setValues((prev) => ({
            ...prev,
            barberoId: e.target.value,
            barberoNombre: barbero ? `${barbero.firstName} ${barbero.lastName}` : '',
          }));
        }}
      >
        {barberos.length === 0 && <option value="">Sin barberos cargados</option>}
        {barberos.map((barbero) => (
          <option key={barbero.id} value={barbero.id}>
            {barbero.firstName} {barbero.lastName}
          </option>
        ))}
      </select>

      <label htmlFor="tipoCorte">Tipo de corte</label>
      <select
        id="tipoCorte"
        value={values.tipoCorteId}
        onChange={(e) => {
          const tipo = tiposCorte.find((t) => t.id === e.target.value);
          setValues((prev) => ({
            ...prev,
            tipoCorteId: e.target.value,
            tipoCorteNombre: tipo?.nombre ?? '',
          }));
        }}
      >
        {tiposCorte.length === 0 && <option value="">Sin tipos de corte parametrizados</option>}
        {tiposCorte.map((tipo) => (
          <option key={tipo.id} value={tipo.id}>
            {tipo.nombre}
          </option>
        ))}
      </select>

      <label htmlFor="precio">Precio</label>
      <input
        id="precio"
        type="number"
        min="0"
        step="0.01"
        value={values.precio}
        onChange={(e) => setValues((prev) => ({ ...prev, precio: Number(e.target.value) }))}
      />

      <label htmlFor="fecha">Fecha</label>
      <input
        id="fecha"
        type="date"
        value={values.fecha}
        onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
      />

      <label htmlFor="imagen">Foto del corte (opcional)</label>
      <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
      {values.imagenUrl && (
        <img src={values.imagenUrl} alt="Vista previa" className="image-upload-preview" />
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="client-form-actions">
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
