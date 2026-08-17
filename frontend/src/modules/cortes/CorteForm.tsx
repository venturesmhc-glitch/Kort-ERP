import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { corteFormSchema, type CorteFormValues } from './cortes.schema';
import { listBarberosRequest } from '../users/users.api';
import type { AppUser } from '../users/users.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { listClientsRequest } from '../clients/clients.api';
import type { Client } from '../clients/clients.types';
import { listTurnosRequest } from '../turnos/turnos.api';
import type { Turno } from '../turnos/turnos.types';
import { readFileAsDataUrl } from '../../lib/file';
import { todayIso } from '../../lib/format';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface CorteFormProps {
  onSubmit: (values: CorteFormValues) => Promise<void>;
  onCancel: () => void;
}

const TODAY = todayIso();

export function CorteForm({ onSubmit, onCancel }: CorteFormProps) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [barberos, setBarberos] = useState<AppUser[]>([]);
  const [tiposCorte, setTiposCorte] = useState<CatalogItem[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [values, setValues] = useState<CorteFormValues>({
    clienteNombre: '',
    clienteApellido: '',
    clienteTelefono: '',
    barberoId: '',
    barberoNombre: '',
    tipoCorteId: '',
    tipoCorteNombre: '',
    precio: 0,
    fecha: TODAY,
    imagenUrl: '',
    appointmentId: '',
  });
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listClientsRequest().then(setClients).catch(() => setClients([]));

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
        setValues((prev) => ({
          ...prev,
          tipoCorteId: first.id,
          tipoCorteNombre: first.nombre,
          precio: first.precio ?? prev.precio,
        }));
      }
    });

    listTurnosRequest().then(setTurnos).catch(() => setTurnos([]));
  }, []);

  const turnosDelDia = turnos.filter(
    (t) =>
      t.barberoId === values.barberoId &&
      t.fecha === TODAY &&
      (t.estado === 'pendiente' || t.estado === 'confirmado')
  );

  function handleClienteExistenteChange(phone: string) {
    const client = clients.find((c) => c.phone === phone);
    if (!client) return;
    setValues((prev) => ({
      ...prev,
      clienteNombre: client.firstName,
      clienteApellido: client.lastName,
      clienteTelefono: client.phone,
    }));
  }

  function handleTurnoChange(appointmentId: string) {
    if (!appointmentId) {
      setValues((prev) => ({ ...prev, appointmentId: '' }));
      return;
    }
    const turno = turnosDelDia.find((t) => t.id === appointmentId);
    if (!turno) return;
    setValues((prev) => ({
      ...prev,
      appointmentId,
      clienteNombre: turno.clienteNombre,
      clienteApellido: turno.clienteApellido,
      clienteTelefono: turno.clienteTelefono,
      tipoCorteId: turno.tipoCorteId,
      tipoCorteNombre: turno.tipoCorteNombre,
    }));
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setValues((prev) => ({ ...prev, imagenUrl: dataUrl }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    const parsed = corteFormSchema.safeParse(values);
    if (!parsed.success) {
      setIssues(parsed.error.issues);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo registrar el corte'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="client-form" onSubmit={handleSubmit}>
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
            appointmentId: '',
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
      {getFieldError(issues, 'barberoId') && (
        <p className="form-error">{getFieldError(issues, 'barberoId')}</p>
      )}

      <label htmlFor="turno">Vincular turno de hoy (opcional)</label>
      <select id="turno" value={values.appointmentId ?? ''} onChange={(e) => handleTurnoChange(e.target.value)}>
        <option value="">Sin vincular (walk-in)</option>
        {turnosDelDia.map((turno) => (
          <option key={turno.id} value={turno.id}>
            {turno.hora} · {turno.clienteNombre} {turno.clienteApellido} ({turno.codigo})
          </option>
        ))}
      </select>

      <label htmlFor="clienteExistente">Cliente existente (opcional, autocompleta abajo)</label>
      <select id="clienteExistente" defaultValue="" onChange={(e) => handleClienteExistenteChange(e.target.value)}>
        <option value="">Cliente nuevo / buscar por telefono</option>
        {clients.map((client) => (
          <option key={client.id} value={client.phone}>
            {client.firstName} {client.lastName} · {client.phone}
          </option>
        ))}
      </select>

      <label htmlFor="clienteNombre">Nombre del cliente</label>
      <input
        id="clienteNombre"
        value={values.clienteNombre}
        onChange={(e) => setValues((prev) => ({ ...prev, clienteNombre: e.target.value }))}
      />
      {getFieldError(issues, 'clienteNombre') && (
        <p className="form-error">{getFieldError(issues, 'clienteNombre')}</p>
      )}

      <label htmlFor="clienteApellido">Apellido del cliente</label>
      <input
        id="clienteApellido"
        value={values.clienteApellido}
        onChange={(e) => setValues((prev) => ({ ...prev, clienteApellido: e.target.value }))}
      />
      {getFieldError(issues, 'clienteApellido') && (
        <p className="form-error">{getFieldError(issues, 'clienteApellido')}</p>
      )}

      <label htmlFor="clienteTelefono">Telefono del cliente</label>
      <input
        id="clienteTelefono"
        value={values.clienteTelefono}
        onChange={(e) => setValues((prev) => ({ ...prev, clienteTelefono: e.target.value }))}
      />
      {getFieldError(issues, 'clienteTelefono') && (
        <p className="form-error">{getFieldError(issues, 'clienteTelefono')}</p>
      )}

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
            precio: tipo?.precio ?? prev.precio,
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
      {getFieldError(issues, 'tipoCorteId') && (
        <p className="form-error">{getFieldError(issues, 'tipoCorteId')}</p>
      )}

      <label htmlFor="precio">Precio</label>
      <input
        id="precio"
        type="number"
        min="0"
        step="1"
        value={values.precio}
        onChange={(e) => setValues((prev) => ({ ...prev, precio: Number(e.target.value) }))}
      />
      {getFieldError(issues, 'precio') && <p className="form-error">{getFieldError(issues, 'precio')}</p>}

      <label htmlFor="fecha">Fecha</label>
      <input
        id="fecha"
        type="date"
        value={values.fecha}
        onChange={(e) => setValues((prev) => ({ ...prev, fecha: e.target.value }))}
      />
      {getFieldError(issues, 'fecha') && <p className="form-error">{getFieldError(issues, 'fecha')}</p>}

      <label htmlFor="imagen">Foto del corte (opcional)</label>
      <input id="imagen" type="file" accept="image/*" onChange={handleImageChange} />
      {values.imagenUrl && (
        <img src={values.imagenUrl} alt={values.clienteNombre} className="image-upload-preview" />
      )}

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
