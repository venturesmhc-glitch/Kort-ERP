import { useEffect, useState } from 'react';
import { getGrowthSettingsRequest, updateGrowthSettingsRequest } from './growth.api';
import type { GrowthSettings } from './growth.types';
import { listDiscountsRequest } from '../discounts/discounts.api';
import type { Discount } from '../discounts/discounts.types';
import { Toggle } from '../../components/Toggle';
import { PageSkeleton, ErrorState, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';
import { getErrorMessage } from '../../lib/apiErrors';

const DEFAULTS: GrowthSettings = {
  loyaltyEnabled: false,
  loyaltyEarnRatio: 100,
  loyaltyRedeemRatio: 10,
  reactivationEnabled: false,
  reactivationInactiveDays: 45,
  reactivationCooldownDays: 30,
  reactivationDiscountId: null,
  reviewRequestEnabled: false,
  reviewRequestDelayHours: 2,
  googleReviewUrl: null,
};

export function GrowthSettingsPage() {
  const toast = useToast();
  const [settings, setSettings] = useState<GrowthSettings>(DEFAULTS);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [loadedSettings, loadedDiscounts] = await Promise.all([
        getGrowthSettingsRequest(),
        listDiscountsRequest(),
      ]);
      setSettings(loadedSettings);
      setDiscounts(loadedDiscounts.filter((d) => d.isActive));
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudo cargar la configuracion.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateGrowthSettingsRequest(settings);
      setSettings(updated);
      toast.success('Configuracion guardada');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar la configuracion'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="page-header">
        <h1>Fidelizacion y Retencion</h1>
      </div>
      <p className="text-muted">
        Puntos de fidelidad, reactivacion automatica de clientes inactivos por WhatsApp y
        solicitud de resena tras un corte.
      </p>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Puntos de fidelidad</h2>
        <div className="checkbox-field">
          <Toggle
            checked={settings.loyaltyEnabled}
            onChange={(loyaltyEnabled) => setSettings((prev) => ({ ...prev, loyaltyEnabled }))}
            label="Habilitar puntos de fidelidad"
          />
          <span>Habilitado</span>
        </div>
        <label htmlFor="loyaltyEarnRatio">Pesos gastados por cada punto otorgado</label>
        <input
          id="loyaltyEarnRatio"
          type="number"
          min={1}
          value={settings.loyaltyEarnRatio}
          onChange={(e) => setSettings((prev) => ({ ...prev, loyaltyEarnRatio: Number(e.target.value) }))}
        />
        <label htmlFor="loyaltyRedeemRatio">Pesos de descuento por cada punto canjeado</label>
        <input
          id="loyaltyRedeemRatio"
          type="number"
          min={1}
          value={settings.loyaltyRedeemRatio}
          onChange={(e) => setSettings((prev) => ({ ...prev, loyaltyRedeemRatio: Number(e.target.value) }))}
        />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Reactivacion de clientes inactivos</h2>
        <div className="checkbox-field">
          <Toggle
            checked={settings.reactivationEnabled}
            onChange={(reactivationEnabled) => setSettings((prev) => ({ ...prev, reactivationEnabled }))}
            label="Habilitar reactivacion automatica"
          />
          <span>Habilitado</span>
        </div>
        <label htmlFor="reactivationInactiveDays">Dias sin visitar para considerarlo inactivo</label>
        <input
          id="reactivationInactiveDays"
          type="number"
          min={1}
          value={settings.reactivationInactiveDays}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, reactivationInactiveDays: Number(e.target.value) }))
          }
        />
        <label htmlFor="reactivationCooldownDays">Dias minimos entre dos mensajes al mismo cliente</label>
        <input
          id="reactivationCooldownDays"
          type="number"
          min={1}
          value={settings.reactivationCooldownDays}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, reactivationCooldownDays: Number(e.target.value) }))
          }
        />
        <label htmlFor="reactivationDiscountId">Cupon para ofrecer en el mensaje</label>
        <select
          id="reactivationDiscountId"
          value={settings.reactivationDiscountId ?? ''}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, reactivationDiscountId: e.target.value || null }))
          }
        >
          <option value="">Sin cupon</option>
          {discounts.map((discount) => (
            <option key={discount.id} value={discount.id}>
              {discount.code} - {discount.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h2>Solicitud de resena</h2>
        <div className="checkbox-field">
          <Toggle
            checked={settings.reviewRequestEnabled}
            onChange={(reviewRequestEnabled) => setSettings((prev) => ({ ...prev, reviewRequestEnabled }))}
            label="Habilitar solicitud de resena"
          />
          <span>Habilitado</span>
        </div>
        <label htmlFor="reviewRequestDelayHours">Horas despues del corte para pedir la resena</label>
        <input
          id="reviewRequestDelayHours"
          type="number"
          min={1}
          value={settings.reviewRequestDelayHours}
          onChange={(e) =>
            setSettings((prev) => ({ ...prev, reviewRequestDelayHours: Number(e.target.value) }))
          }
        />
        <label htmlFor="googleReviewUrl">Link para dejar la resena en Google</label>
        <input
          id="googleReviewUrl"
          type="url"
          placeholder="https://g.page/r/..."
          value={settings.googleReviewUrl ?? ''}
          onChange={(e) => setSettings((prev) => ({ ...prev, googleReviewUrl: e.target.value || null }))}
        />
      </div>

      <div className="client-form-actions">
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
