import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clienteStepSchema, type ClienteStepFormValues } from './turno-wizard.schema';
import { loadTurnoDraft, saveTurnoDraft, clearTurnoDraft, type TurnoDraft } from './turno-wizard.types';
import { listPublicBarberosRequest } from '../users/users.api';
import type { PublicBarbero } from '../users/users.types';
import { listPublicCatalogItemsRequest } from '../catalogs/catalogs.api';
import type { CatalogItem } from '../catalogs/catalogs.types';
import { crearTurnoRequest, listSlotsDisponiblesRequest } from '../turnos/turnos.api';
import type { Turno } from '../turnos/turnos.types';
import { clearPendingMerchSaleId, loadPendingMerchSale, type PendingMerchSale } from '../public-store/store.types';
import { formatDate, formatCurrency, shiftIso, todayIso } from '../../lib/format';
import { ErrorState, Skeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { useBusinessSettings } from '../business-settings/BusinessSettingsContext';
import { useBusinessTheme } from '../../config/useBusinessTheme';
import { validateDiscountRequest, type ValidateDiscountResult } from '../discounts/discounts.api';

const TODAY = todayIso();
const STEP_LABELS = ['Tus datos', 'Profesional', 'Fecha y horario', 'Servicio', 'Confirmar'];
const DAY_OPTIONS = Array.from({ length: 5 }, (_, i) => shiftIso(TODAY, i));

const EMPTY_CLIENTE: ClienteStepFormValues = { nombre: '', apellido: '', telefono: '', email: '' };

function dowShort(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(new Date(y, m - 1, d)).replace('.', '').toUpperCase();
}

function dayNum(iso: string) {
  return Number(iso.split('-')[2]);
}

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function buildIcsHref(turno: Turno, businessName: string) {
  const start = new Date(`${turno.fecha}T${turno.hora}:00`);
  const end = new Date(start.getTime() + 45 * 60000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Turno en ${businessName}`,
    `DESCRIPTION:${turno.tipoCorteNombre} con ${turno.barberoNombre}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export function TurnoWizardPage() {
  useBusinessTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings, loading: settingsLoading } = useBusinessSettings();

  const [step, setStep] = useState(1);
  const [cliente, setCliente] = useState<ClienteStepFormValues>(EMPTY_CLIENTE);
  const [barberos, setBarberos] = useState<PublicBarbero[]>([]);
  const [barberoId, setBarberoId] = useState('');
  const [barberoNombre, setBarberoNombre] = useState('');
  const [anyBarbero, setAnyBarbero] = useState(false);
  const [fecha, setFecha] = useState(TODAY);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotResolution, setSlotResolution] = useState<Record<string, { id: string; nombre: string }>>({});
  const [hora, setHora] = useState('');
  const [tiposCorte, setTiposCorte] = useState<CatalogItem[]>([]);
  const [tipoCorteId, setTipoCorteId] = useState('');
  const [tipoCorteNombre, setTipoCorteNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [turnoConfirmado, setTurnoConfirmado] = useState<Turno | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountPreview, setDiscountPreview] = useState<ValidateDiscountResult | null>(null);
  const [checkingDiscount, setCheckingDiscount] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [pendingMerch, setPendingMerch] = useState<PendingMerchSale | null>(null);

  useEffect(() => {
    setInitialLoading(true);
    setInitialError(null);
    Promise.all([
      listPublicBarberosRequest().then(setBarberos),
      listPublicCatalogItemsRequest('tipos-corte').then(setTiposCorte),
    ])
      .catch((err) => setInitialError(toErrorMessage(err, 'No se pudo cargar la informacion del turno.')))
      .finally(() => setInitialLoading(false));
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
    if (!fecha) {
      setSlots([]);
      return;
    }
    if (anyBarbero) {
      if (barberos.length === 0) {
        setSlots([]);
        return;
      }
      Promise.all(
        barberos.map((b) =>
          listSlotsDisponiblesRequest(b.id, fecha).then((available) =>
            available.map((h) => ({ hora: h, id: b.id, nombre: `${b.firstName} ${b.lastName}` }))
          )
        )
      )
        .then((results) => {
          const map: Record<string, { id: string; nombre: string }> = {};
          for (const { hora: h, id, nombre } of results.flat()) {
            if (!map[h]) map[h] = { id, nombre };
          }
          const available = Object.keys(map).sort();
          setSlots(available);
          setSlotResolution(map);
          setHora((current) => (available.includes(current) ? current : ''));
        })
        .catch(() => {
          setSlots([]);
          setSlotResolution({});
        });
      return;
    }
    if (!barberoId) {
      setSlots([]);
      return;
    }
    listSlotsDisponiblesRequest(barberoId, fecha)
      .then((available) => {
        setSlots(available);
        setHora((current) => (available.includes(current) ? current : ''));
      })
      .catch(() => setSlots([]));
  }, [barberoId, fecha, anyBarbero, barberos]);

  useEffect(() => {
    if (step === 5) {
      setPendingMerch(loadPendingMerchSale());
    }
  }, [step]);

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

  function handleHorarioContinue() {
    if (anyBarbero && slotResolution[hora]) {
      setBarberoId(slotResolution[hora].id);
      setBarberoNombre(slotResolution[hora].nombre);
    }
    goToStep(4);
  }

  function currentDraft(): TurnoDraft {
    return { cliente, barberoId, barberoNombre, fecha, hora, tipoCorteId, tipoCorteNombre };
  }

  function handleVerMercancia() {
    saveTurnoDraft(currentDraft());
    navigate('/tienda?turno=1');
  }

  async function handleAplicarCupon() {
    if (!discountCode.trim()) return;
    setCheckingDiscount(true);
    setDiscountPreview(null);
    try {
      const result = await validateDiscountRequest({
        code: discountCode.trim(),
        corte: { tipoCorteId },
      });
      setDiscountPreview(result);
      if (!result.valid) {
        toast.error(result.reason ?? 'Cupon invalido');
      }
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo validar el cupon'));
    } finally {
      setCheckingDiscount(false);
    }
  }

  async function handleConfirmar() {
    setError(null);
    setConfirming(true);
    try {
      const merchSaleId = loadPendingMerchSale()?.saleId ?? undefined;
      const codigoIngresado = discountCode.trim() || undefined;
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
        merchSaleId,
        discountCode: codigoIngresado,
      });
      clearTurnoDraft();
      clearPendingMerchSaleId();
      setPendingMerch(null);
      // El resultado real de la aplicacion (no el preview) viaja en
      // discountApplied: un cupon puede haber quedado sin usos entre que se
      // valido y se confirmo el turno.
      if (codigoIngresado && !turno.discountApplied?.corte && !turno.discountApplied?.merch) {
        toast.error('El cupon no se pudo aplicar');
      }
      setTurnoConfirmado(turno);
      setStep(6);
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo confirmar el turno'));
    } finally {
      setConfirming(false);
    }
  }

  if (step === 6 && turnoConfirmado) {
    const mapsHref = settings.contact.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contact.address)}`
      : null;
    const whatsappHref = settings.contact.whatsapp
      ? `https://wa.me/${settings.contact.whatsapp.replace(/[^\d]/g, '')}`
      : null;

    return (
      <div className="wizard-done">
        <div className="wizard-done-check" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1>Turno confirmado</h1>
        <div className="wizard-done-block">
          <div className="wizard-done-code">{turnoConfirmado.codigo}</div>
          <div className="wizard-done-row">
            <span>Cuando</span>
            <span>
              {formatDate(turnoConfirmado.fecha)} · {turnoConfirmado.hora}
            </span>
          </div>
          <div className="wizard-done-row">
            <span>Con</span>
            <span>{turnoConfirmado.barberoNombre}</span>
          </div>
          <div className="wizard-done-row">
            <span>Servicio</span>
            <span>{turnoConfirmado.tipoCorteNombre}</span>
          </div>
        </div>
        <p className="wizard-done-text">
          Te mandamos la confirmacion por mail y un recordatorio por WhatsApp 6 horas antes del turno.
        </p>
        <div className="wizard-done-actions">
          <a
            href={buildIcsHref(turnoConfirmado, settings.name)}
            download={`turno-${turnoConfirmado.codigo}.ics`}
            className="button-accent wizard-cta"
          >
            Agendar en mi calendario
          </a>
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noreferrer" className="wizard-done-outline">
              Como llegar
            </a>
          )}
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="wizard-done-link">
              Cancelar o reprogramar por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  if (initialLoading || settingsLoading) {
    return (
      <div className="wizard-shell">
        <div className="wizard-body">
          <p className="text-muted">Cargando informacion del negocio...</p>
          <Skeleton style={{ height: 40, marginTop: 20, marginBottom: 16 }} />
          <Skeleton style={{ height: 60, marginBottom: 9 }} />
          <Skeleton style={{ height: 60, marginBottom: 9 }} />
          <Skeleton style={{ height: 60 }} />
        </div>
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="wizard-shell">
        <div className="wizard-body">
          <ErrorState message={initialError} />
        </div>
      </div>
    );
  }

  const corteSeleccionado = tiposCorte.find((t) => t.id === tipoCorteId);
  const manana = slots.filter((s) => s < '14:00');
  const tarde = slots.filter((s) => s >= '14:00');
  const continuarConLabel = anyBarbero ? 'Continuar' : barberoNombre ? `Continuar con ${barberoNombre}` : 'Continuar';

  return (
    <div className="wizard-shell">
      <div className="wizard-progress">
        {STEP_LABELS.map((label, index) => (
          <span key={label} className={`wizard-progress-seg${index + 1 < step ? ' done' : ''}`} />
        ))}
      </div>
      <div className="wizard-progress-label">
        Paso {step} de {STEP_LABELS.length} · {STEP_LABELS[step - 1]}
      </div>

      {step === 1 ? (
        <div className="wizard-header">
          <div className="wizard-header-brand">
            <span className="wizard-header-mark" aria-hidden="true" />
            <span className="wizard-header-name">{settings.name}</span>
          </div>
          {settings.contact.address && <span className="wizard-header-address">{settings.contact.address}</span>}
        </div>
      ) : (
        <div className="wizard-header">
          <button type="button" className="wizard-header-back" onClick={() => goToStep(step - 1)}>
            <span className="wizard-header-back-arrow" aria-hidden="true">
              ←
            </span>
            Reserva tu turno
          </button>
        </div>
      )}

      <div className="wizard-body">
        {error && <p className="form-error">{error}</p>}

        {step === 1 && (
          <>
            <h1>Tus datos</h1>
            <label className="wizard-field" htmlFor="nombre">
              <span>Nombre</span>
              <input
                id="nombre"
                value={cliente.nombre}
                onChange={(e) => setCliente((prev) => ({ ...prev, nombre: e.target.value }))}
              />
            </label>
            <label className="wizard-field" htmlFor="apellido">
              <span>Apellido</span>
              <input
                id="apellido"
                value={cliente.apellido}
                onChange={(e) => setCliente((prev) => ({ ...prev, apellido: e.target.value }))}
              />
            </label>
            <label className="wizard-field" htmlFor="telefono">
              <span>Telefono</span>
              <input
                id="telefono"
                value={cliente.telefono}
                onChange={(e) => setCliente((prev) => ({ ...prev, telefono: e.target.value }))}
              />
            </label>
            <label className="wizard-field" htmlFor="email">
              <span>Email (opcional)</span>
              <input
                id="email"
                type="email"
                placeholder="Para recibir la confirmacion"
                value={cliente.email}
                onChange={(e) => setCliente((prev) => ({ ...prev, email: e.target.value }))}
              />
            </label>
            <p className="wizard-note">Te avisamos por WhatsApp 6 horas antes del turno.</p>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Elegi tu profesional</h1>
            <div className="wizard-list">
              {barberos.map((barbero) => {
                const active = !anyBarbero && barbero.id === barberoId;
                return (
                  <button
                    key={barbero.id}
                    type="button"
                    className={`wizard-person-card${active ? ' active' : ''}`}
                    onClick={() => {
                      setAnyBarbero(false);
                      setBarberoId(barbero.id);
                      setBarberoNombre(`${barbero.firstName} ${barbero.lastName}`);
                    }}
                  >
                    <span className="wizard-person-avatar">{initialsOf(barbero.firstName, barbero.lastName)}</span>
                    <span className="wizard-person-name">
                      {barbero.firstName} {barbero.lastName}
                    </span>
                    {active && <span className="wizard-person-dot" aria-hidden="true" />}
                  </button>
                );
              })}
              <button
                type="button"
                className={`wizard-person-card dashed${anyBarbero ? ' active' : ''}`}
                onClick={() => {
                  setAnyBarbero(true);
                  setBarberoId('');
                  setBarberoNombre('');
                }}
              >
                Me da igual — el primero disponible
              </button>
              {barberos.length === 0 && <p className="text-muted">No hay profesionales disponibles.</p>}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1>Fecha y horario</h1>
            <div className="wizard-day-row">
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`wizard-day${day === fecha ? ' active' : ''}`}
                  onClick={() => setFecha(day)}
                >
                  <div className="dow">{dowShort(day)}</div>
                  <div className="num">{dayNum(day)}</div>
                </button>
              ))}
            </div>

            {slots.length === 0 ? (
              <p className="text-muted">No hay horarios disponibles para esa fecha.</p>
            ) : (
              <>
                {manana.length > 0 && (
                  <>
                    <div className="wizard-slot-group-label">Manana</div>
                    <div className="wizard-slot-grid">
                      {manana.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`wizard-slot${slot === hora ? ' active' : ''}`}
                          onClick={() => setHora(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {tarde.length > 0 && (
                  <>
                    <div className="wizard-slot-group-label">Tarde</div>
                    <div className="wizard-slot-grid">
                      {tarde.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`wizard-slot${slot === hora ? ' active' : ''}`}
                          onClick={() => setHora(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {step === 4 && (
          <>
            <h1>Tipo de corte</h1>
            <div className="wizard-list">
              {tiposCorte.map((tipo) => (
                <button
                  key={tipo.id}
                  type="button"
                  className={`wizard-service-card${tipo.id === tipoCorteId ? ' active' : ''}`}
                  onClick={() => {
                    setTipoCorteId(tipo.id);
                    setTipoCorteNombre(tipo.nombre);
                  }}
                >
                  <span className="wizard-service-name">{tipo.nombre}</span>
                  {tipo.precio !== undefined && (
                    <span className="wizard-service-price">{formatCurrency(tipo.precio)}</span>
                  )}
                </button>
              ))}
              {tiposCorte.length === 0 && <p className="text-muted">No hay tipos de corte cargados.</p>}
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <h1>Confirma tu turno</h1>
            <div className="wizard-summary-card">
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Cuando</span>
                <span>
                  {formatDate(fecha)} · {hora}
                </span>
              </div>
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Con</span>
                <span>{barberoNombre}</span>
              </div>
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Servicio</span>
                <span>
                  {tipoCorteNombre}
                  {corteSeleccionado?.precio !== undefined && ` · ${formatCurrency(corteSeleccionado.precio)}`}
                </span>
              </div>
              {pendingMerch && (
                <div className="wizard-summary-row">
                  <span className="wizard-summary-label">Merchandising</span>
                  <span>
                    {pendingMerch.itemCount} producto{pendingMerch.itemCount === 1 ? '' : 's'} ·{' '}
                    {formatCurrency(pendingMerch.total)}
                  </span>
                </div>
              )}
              {(corteSeleccionado?.precio !== undefined || pendingMerch) && (
                <div className="wizard-summary-row wizard-summary-total">
                  <span className="wizard-summary-label">Total</span>
                  <span>{formatCurrency((corteSeleccionado?.precio ?? 0) + (pendingMerch?.total ?? 0))}</span>
                </div>
              )}
            </div>
            <p className="text-muted">
              Se abona en el local. {cliente.nombre} {cliente.apellido} · {cliente.telefono}
            </p>

            <label className="wizard-field" htmlFor="discountCode">
              <span>Cupon de descuento (opcional)</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="discountCode"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value);
                    setDiscountPreview(null);
                  }}
                  placeholder="CODIGO"
                  disabled={confirming}
                />
                <button
                  type="button"
                  className="button-secondary"
                  onClick={handleAplicarCupon}
                  disabled={checkingDiscount || confirming || !discountCode.trim()}
                >
                  {checkingDiscount ? 'Verificando...' : 'Aplicar'}
                </button>
              </div>
            </label>
            {discountPreview && (
              <p className={discountPreview.valid ? 'text-muted' : 'form-error'}>
                {discountPreview.valid && discountPreview.corte
                  ? `Cupon valido: -${formatCurrency(discountPreview.corte.discountAmount)} en tu corte`
                  : (discountPreview.reason ?? 'Este cupon no aplica a tu turno')}
              </p>
            )}

            <div className="wizard-upsell">
              <span>¿Queres ver la tienda de merchandising antes de confirmar?</span>
              <button type="button" className="button-secondary" onClick={handleVerMercancia} disabled={confirming}>
                Ver
              </button>
            </div>

            <p className="wizard-policy">
              Podes cancelar o reprogramar tu turno hasta 2 horas antes sin costo, escribiendonos por WhatsApp.
            </p>
          </>
        )}
      </div>

      <div className="wizard-footer">
        {step === 1 && (
          <button type="button" className="button-primary wizard-cta" onClick={handleClienteSubmit}>
            Continuar
          </button>
        )}
        {step === 2 && (
          <button
            type="button"
            className="button-primary wizard-cta"
            disabled={!barberoId && !anyBarbero}
            onClick={() => goToStep(3)}
          >
            {continuarConLabel}
          </button>
        )}
        {step === 3 && (
          <button type="button" className="button-primary wizard-cta" disabled={!hora} onClick={handleHorarioContinue}>
            Continuar · {dowShort(fecha)} {dayNum(fecha)}, {hora || '--:--'}
          </button>
        )}
        {step === 4 && (
          <button
            type="button"
            className="button-primary wizard-cta"
            disabled={!tipoCorteId}
            onClick={() => goToStep(5)}
          >
            Continuar
          </button>
        )}
        {step === 5 && (
          <>
            <button type="button" className="button-primary wizard-cta" onClick={handleConfirmar} disabled={confirming}>
              {confirming ? 'Confirmando...' : 'Confirmar turno'}
            </button>
            <button
              type="button"
              className="button-secondary wizard-cta"
              onClick={() => goToStep(3)}
              disabled={confirming}
            >
              Cambiar horario
            </button>
          </>
        )}
      </div>
    </div>
  );
}
