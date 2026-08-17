import { useEffect, useState, type FormEvent } from 'react';
import { DIAS_SEMANA, DIA_LABELS, type DiaSemana, type HorarioInput } from './turnos.types';
import { listBarberosRequest } from '../users/users.api';
import type { AppUser } from '../users/users.types';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';

interface HorarioFormProps {
  initialValues?: HorarioInput;
  onSubmit: (values: HorarioInput) => Promise<void>;
  onCancel: () => void;
}

export function HorarioForm({ initialValues, onSubmit, onCancel }: HorarioFormProps) {
  const toast = useToast();
  const [barberos, setBarberos] = useState<AppUser[]>([]);
  const [values, setValues] = useState<HorarioInput>(
    initialValues ?? {
      barberoId: '',
      barberoNombre: '',
      dia: 'LUN',
      horaInicio: '09:00',
      horaFin: '18:00',
    }
  );
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listBarberosRequest().then((items) => {
      setBarberos(items);
      if (!initialValues && items[0]) {
        setValues((prev) => ({
          ...prev,
          barberoId: items[0].id,
          barberoNombre: `${items[0].firstName} ${items[0].lastName}`,
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);

    if (!values.barberoId) {
      setIssues([{ path: ['barberoId'], message: 'Selecciona un barbero' }]);
      return;
    }
    if (values.horaInicio >= values.horaFin) {
      setIssues([{ path: ['horaFin'], message: 'La hora de inicio debe ser anterior a la hora de fin' }]);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar el horario'));
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

      <label htmlFor="dia">Dia</label>
      <select
        id="dia"
        value={values.dia}
        onChange={(e) => setValues((prev) => ({ ...prev, dia: e.target.value as DiaSemana }))}
      >
        {DIAS_SEMANA.map((dia) => (
          <option key={dia} value={dia}>
            {DIA_LABELS[dia]}
          </option>
        ))}
      </select>

      <label htmlFor="horaInicio">Hora inicio</label>
      <input
        id="horaInicio"
        type="time"
        value={values.horaInicio}
        onChange={(e) => setValues((prev) => ({ ...prev, horaInicio: e.target.value }))}
      />

      <label htmlFor="horaFin">Hora fin</label>
      <input
        id="horaFin"
        type="time"
        value={values.horaFin}
        onChange={(e) => setValues((prev) => ({ ...prev, horaFin: e.target.value }))}
      />
      {getFieldError(issues, 'horaFin') && <p className="form-error">{getFieldError(issues, 'horaFin')}</p>}

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
