import { useState } from 'react';
import { usePlan } from './PlanContext';
import { updateSettingsRequest } from './plan.api';
import { useToast } from '../../components/toast/ToastProvider';
import { getErrorMessage } from '../../lib/apiErrors';
import { PageSkeleton } from '../../components/AsyncState';
import type { Plan } from './plan.types';

export function PlanSettingsPage() {
  const { plan, loading, refreshPlan } = usePlan();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleChange(nextPlan: Plan) {
    if (nextPlan === plan) return;
    setSaving(true);
    try {
      await updateSettingsRequest(nextPlan);
      await refreshPlan();
      toast.success(`Plan actualizado a ${nextPlan === 'INTEGRAL' ? 'Integral' : 'Basico'}`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo actualizar el plan'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Plan</h1>
      </div>
      <p className="text-muted">
        Definir el plan de esta instalacion. El Plan Integral habilita Proveedores, Ordenes de
        compra automaticas y Reportes/exportacion para todos los usuarios.
      </p>

      {loading ? (
        <PageSkeleton />
      ) : (
        <div className="card-grid">
          <button
            type="button"
            className={`card plan-option ${plan === 'BASICO' ? 'plan-option-active' : ''}`}
            disabled={saving}
            onClick={() => handleChange('BASICO')}
          >
            <h2>Plan Basico</h2>
            <p className="text-muted">Turnos, clientes, ventas, cortes, empleados y caja.</p>
          </button>

          <button
            type="button"
            className={`card plan-option ${plan === 'INTEGRAL' ? 'plan-option-active' : ''}`}
            disabled={saving}
            onClick={() => handleChange('INTEGRAL')}
          >
            <h2>Plan Integral</h2>
            <p className="text-muted">
              Todo lo del Plan Basico, mas alertas de stock avanzadas, proveedores, ordenes de
              compra automaticas y reportes/exportacion.
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
