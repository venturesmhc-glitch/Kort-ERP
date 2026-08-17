import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clienteStepSchema, type ClienteStepFormValues } from './turno-wizard.schema';
import { loadTurnoDraft, saveTurnoDraft, clearTurnoDraft, type TurnoDraft } from './turno-wizard.types';
import { listBarberosRequest } from '../users/users.api';
import type { AppUser } from '../users/users.types';
import { listActiveCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { crearTurnoRequest, listSlotsDisponiblesRequest } from '../turnos/turnos.api';
import type { Turno } from '../turnos/turnos.types';
import { formatDate, todayIso } from '../../lib/format';

const TODAY = todayIso();
const STEP_LABELS = ['Tus datos', 'Barbero', 'Horario', 'Tipo de corte', 'Confirmar'];

const EMPTY_CLIENTE: ClienteStepFormValues = { nombre: '', apellido: '', telefono: '', email: '' };

export function TurnoWizardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [cliente, setCliente] = useState<ClienteStepFormValues>(EMPTY_CLIENTE);
  const [barberos, setBarberos] = useState<AppUser[]>([]);
  const [barberoId, setBarberoId] = useState('');
  const [barberoNombre, setBarberoNombre] = useState('');
  const [fecha, setFecha] = useState(TODAY);
  const [slots, setSlots] = useState<string[]>([]);
  const [hora, setHora] = useState('');
  const [tiposCorte, setTiposCorte] = useState<CatalogItem[]>([]);
  const [tipoCorteId, setTipoCorteId] = useState('');
  const [tipoCorteNombre, setTipoCorteNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [turnoConfirmado, setTurnoConfirmado] = useState<Turno | null>(null);

  useEffect(() => {
    listBarberosRequest().then(setBarberos);
    listActiveCatalogItemsRequest('tipos-corte').then(setTiposCorte);
  }, []);

  useEffect(() => {
    if (searchParams.get('resume') !== '1') return;
    const draft = loadTurnoDraft();
    if (!draft) return;
    setCliente(draft.cliente);
    setBarberoId(draft.barberoId);
    setBarberoNombre(draft.barberoNombre);
    setFecha(draft.fecha);
    setHora(draft.hora);
    setTipoCorteId(draft.tipoCorteId);
    setTipoCorteNombre(draft.tipoCorteNombre);
    setStep(5);
  }, [searchParams]);

  useEffect(() => {
    if (!barberoId || !fecha) {
      setSlots([]);
      return;
    }
    listSlotsDisponiblesRequest(barberoId, fecha).then((available) => {
      setSlots(available);
      setHora((current) => (available.includes(current) ? current : ''));
    });
  }, [barberoId, fecha]);

  function goToStep(next: number) {
    setError(null);
    setStep(next);
  }

  function handleClienteSubmit() {
    const parsed = clienteStepSchema.safeParse(cliente);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados');
      return;
    }
    goToStep(2);
  }

  function currentDraft(): TurnoDraft {
    return {
      cliente,
      barberoId,
      barberoNombre,
      fecha,
      hora,
      tipoCorteId,
      tipoCorteNombre,
    };
  }

  function handleVerMercancia() {
    saveTurnoDraft(currentDraft());
    navigate('/tienda?turno=1');
  }

  async function handleConfirmar() {
    setError(null);
    setConfirming(true);
    try {
      const turno = await crearTurnoRequest({
        clienteNombre: cliente.nombre,
        clienteApellido: cliente.apellido,
        clienteTelefono: cliente.telefono,
        clienteEmail: cliente.email || undefined,
        barberoId,
        barberoNombre,
        fecha,
        hora,
        tipoCorteId,
        tipoCorteNombre,
      });
      clearTurnoDraft();
      setTurnoConfirmado(turno);
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar el turno');
    } finally {
      setConfirming(false);
    }
  }

  if (step === 6 && turnoConfirmado) {
    return (
      <div className="wizard-card">
        <h1>Turno confirmado</h1>
        <p>
          Tu codigo de turno es <strong className="turno-code">{turnoConfirmado.codigo}</strong>
        </p>
        <p>
          {turnoConfirmado.clienteNombre} {turnoConfirmado.clienteApellido} con{' '}
          {turnoConfirmado.barberoNombre} el {formatDate(turnoConfirmado.fecha)} a las{' '}
          {turnoConfirmado.hora} ({turnoConfirmado.tipoCorteNombre}).
        </p>
        <p className="text-muted">
          Te enviamos la confirmacion por mail. Vas a recibir un recordatorio por WhatsApp 6
          horas antes de tu turno.
        </p>
        <button type="button" onClick={() => navigate('/')}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="wizard-card">
      <h1>Solicitar turno</h1>
      <ol className="wizard-steps">
        {STEP_LABELS.map((label, index) => (
          <li key={label} className={index + 1 === step ? 'wizard-step active' : 'wizard-step'}>
            {label}
          </li>
        ))}
      </ol>

      {error && <p className="form-error">{error}</p>}

      {step === 1 && (
        <div className="client-form">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            value={cliente.nombre}
            onChange={(e) => setCliente((prev) => ({ ...prev, nombre: e.target.value }))}
          />
          <label htmlFor="apellido">Apellido</label>
          <input
            id="apellido"
            value={cliente.apellido}
            onChange={(e) => setCliente((prev) => ({ ...prev, apellido: e.target.value }))}
          />
          <label htmlFor="telefono">Telefono</label>
          <input
            id="telefono"
            value={cliente.telefono}
            onChange={(e) => setCliente((prev) => ({ ...prev, telefono: e.target.value }))}
          />
          <label htmlFor="email">Email (opcional)</label>
          <input
            id="email"
            type="email"
            value={cliente.email}
            onChange={(e) => setCliente((prev) => ({ ...prev, email: e.target.value }))}
          />
          <div className="client-form-actions">
            <button type="button" onClick={handleClienteSubmit}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="option-grid">
            {barberos.map((barbero) => (
              <button
                key={barbero.id}
                type="button"
                className={barbero.id === barberoId ? 'option-card active' : 'option-card'}
                onClick={() => {
                  setBarberoId(barbero.id);
                  setBarberoNombre(`${barbero.firstName} ${barbero.lastName}`);
                }}
              >
                {barbero.firstName} {barbero.lastName}
              </button>
            ))}
            {barberos.length === 0 && <p className="text-muted">No hay barberos disponibles.</p>}
          </div>
          <div className="client-form-actions">
            <button type="button" onClick={() => goToStep(1)}>
              Atras
            </button>
            <button type="button" disabled={!barberoId} onClick={() => goToStep(3)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label htmlFor="fecha">Fecha</label>
          <input
            id="fecha"
            type="date"
            min={TODAY}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />

          <div className="option-grid">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className={slot === hora ? 'option-card active' : 'option-card'}
                onClick={() => setHora(slot)}
              >
                {slot}
              </button>
            ))}
            {slots.length === 0 && (
              <p className="text-muted">No hay horarios disponibles para esa fecha.</p>
            )}
          </div>

          <div className="client-form-actions">
            <button type="button" onClick={() => goToStep(2)}>
              Atras
            </button>
            <button type="button" disabled={!hora} onClick={() => goToStep(4)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="option-grid">
            {tiposCorte.map((tipo) => (
              <button
                key={tipo.id}
                type="button"
                className={tipo.id === tipoCorteId ? 'option-card active' : 'option-card'}
                onClick={() => {
                  setTipoCorteId(tipo.id);
                  setTipoCorteNombre(tipo.nombre);
                }}
              >
                {tipo.nombre}
              </button>
            ))}
            {tiposCorte.length === 0 && <p className="text-muted">No hay tipos de corte cargados.</p>}
          </div>
          <div className="client-form-actions">
            <button type="button" onClick={() => goToStep(3)}>
              Atras
            </button>
            <button type="button" disabled={!tipoCorteId} onClick={() => goToStep(5)}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <div className="card">
            <h2>Resumen de tu turno</h2>
            <p>
              {cliente.nombre} {cliente.apellido} · {cliente.telefono}
            </p>
            <p>
              {barberoNombre} · {formatDate(fecha)} a las {hora}
            </p>
            <p>{tipoCorteNombre}</p>
          </div>

          <p>¿Queres ver la tienda de merchandising antes de confirmar tu turno?</p>

          <div className="client-form-actions">
            <button type="button" onClick={() => goToStep(4)} disabled={confirming}>
              Atras
            </button>
            <button type="button" onClick={handleVerMercancia} disabled={confirming}>
              Ver mercancia
            </button>
            <button type="button" onClick={handleConfirmar} disabled={confirming}>
              {confirming ? 'Confirmando...' : 'Confirmar turno'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
