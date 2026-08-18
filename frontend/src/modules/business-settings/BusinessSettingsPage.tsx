import { useEffect, useState, type FormEvent } from 'react';
import type { BusinessSettings } from '@kort/shared';
import { useBusinessSettings } from './BusinessSettingsContext';
import { updateBusinessSettingsRequest } from './business-settings.api';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';
import { LoadingState } from '../../components/AsyncState';

export function BusinessSettingsPage() {
  const { settings, loading, refresh } = useBusinessSettings();
  const toast = useToast();
  const [values, setValues] = useState<BusinessSettings>(settings);
  const [seeded, setSeeded] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // El provider carga los datos una sola vez al arrancar la app; recien acá
  // podemos copiarlos al estado local editable del form.
  useEffect(() => {
    if (!loading && !seeded) {
      setValues(settings);
      setSeeded(true);
    }
  }, [loading, seeded, settings]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIssues(undefined);
    setSaving(true);
    try {
      await updateBusinessSettingsRequest(values);
      await refresh();
      toast.success('Datos del negocio actualizados');
    } catch (err) {
      if (err instanceof ApiError && err.issues) {
        setIssues(err.issues);
      }
      toast.error(getErrorMessage(err, 'No se pudo guardar la configuracion'));
    } finally {
      setSaving(false);
    }
  }

  if (loading && !seeded) {
    return <LoadingState />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Datos del negocio</h1>
      </div>
      <p className="text-muted">
        Nombre, contacto y colores de marca que se muestran en la landing publica (inicio, turnos,
        tienda y contacto).
      </p>

      <form className="client-form business-settings-form" onSubmit={handleSubmit}>
        <h2>General</h2>

        <label htmlFor="name">Nombre del negocio</label>
        <input id="name" value={values.name} onChange={(e) => setValues((prev) => ({ ...prev, name: e.target.value }))} />
        {getFieldError(issues, 'name') && <p className="form-error">{getFieldError(issues, 'name')}</p>}

        <label htmlFor="tagline">Tagline (opcional)</label>
        <input
          id="tagline"
          value={values.tagline ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, tagline: e.target.value }))}
        />

        <label htmlFor="logoUrl">URL del logo (opcional)</label>
        <input
          id="logoUrl"
          value={values.logoUrl ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, logoUrl: e.target.value }))}
        />

        <label htmlFor="headerImageUrl">URL de imagen de portada (opcional)</label>
        <input
          id="headerImageUrl"
          value={values.headerImageUrl ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, headerImageUrl: e.target.value }))}
        />

        <label htmlFor="footerImageUrl">URL de imagen de pie (opcional)</label>
        <input
          id="footerImageUrl"
          value={values.footerImageUrl ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, footerImageUrl: e.target.value }))}
        />

        <h2>Contacto</h2>

        <label htmlFor="address">Direccion (opcional)</label>
        <input
          id="address"
          value={values.contact.address ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, address: e.target.value } }))}
        />

        <label htmlFor="phone">Telefono (opcional)</label>
        <input
          id="phone"
          value={values.contact.phone ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
        />

        <label htmlFor="whatsapp">WhatsApp (opcional)</label>
        <input
          id="whatsapp"
          value={values.contact.whatsapp ?? ''}
          placeholder="+54 9 341 555-0142"
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, whatsapp: e.target.value } }))}
        />

        <label htmlFor="email">Email (opcional)</label>
        <input
          id="email"
          value={values.contact.email ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
        />

        <label htmlFor="hours">Horarios (opcional)</label>
        <input
          id="hours"
          value={values.contact.hours ?? ''}
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, hours: e.target.value } }))}
        />

        <h2>Redes sociales</h2>

        <label htmlFor="instagram">Instagram (opcional)</label>
        <input
          id="instagram"
          value={values.contact.socials?.instagram ?? ''}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              contact: { ...prev.contact, socials: { ...prev.contact.socials, instagram: e.target.value } },
            }))
          }
        />

        <label htmlFor="facebook">Facebook (opcional)</label>
        <input
          id="facebook"
          value={values.contact.socials?.facebook ?? ''}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              contact: { ...prev.contact, socials: { ...prev.contact.socials, facebook: e.target.value } },
            }))
          }
        />

        <label htmlFor="tiktok">TikTok (opcional)</label>
        <input
          id="tiktok"
          value={values.contact.socials?.tiktok ?? ''}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              contact: { ...prev.contact, socials: { ...prev.contact.socials, tiktok: e.target.value } },
            }))
          }
        />

        <h2>Badge junto al logo</h2>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={values.badge.enabled}
            onChange={(e) => setValues((prev) => ({ ...prev, badge: { ...prev.badge, enabled: e.target.checked } }))}
          />
          Mostrar badge
        </label>

        {values.badge.enabled && (
          <>
            <label htmlFor="badgeText">Texto del badge</label>
            <input
              id="badgeText"
              value={values.badge.text ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, badge: { ...prev.badge, text: e.target.value } }))}
            />

            <label htmlFor="badgeColor">Color del badge</label>
            <input
              id="badgeColor"
              type="color"
              value={values.badge.color || '#d4af37'}
              onChange={(e) => setValues((prev) => ({ ...prev, badge: { ...prev.badge, color: e.target.value } }))}
            />
          </>
        )}

        <h2>Tema</h2>

        <div className="theme-color-grid">
          <label>
            Color primario
            <input
              type="color"
              value={values.theme.primary}
              onChange={(e) => setValues((prev) => ({ ...prev, theme: { ...prev.theme, primary: e.target.value } }))}
            />
          </label>
          <label>
            Color secundario
            <input
              type="color"
              value={values.theme.secondary}
              onChange={(e) => setValues((prev) => ({ ...prev, theme: { ...prev.theme, secondary: e.target.value } }))}
            />
          </label>
          <label>
            Color de acento
            <input
              type="color"
              value={values.theme.accent}
              onChange={(e) => setValues((prev) => ({ ...prev, theme: { ...prev.theme, accent: e.target.value } }))}
            />
          </label>
          <label>
            Fondo
            <input
              type="color"
              value={values.theme.background}
              onChange={(e) => setValues((prev) => ({ ...prev, theme: { ...prev.theme, background: e.target.value } }))}
            />
          </label>
          <label>
            Texto
            <input
              type="color"
              value={values.theme.text}
              onChange={(e) => setValues((prev) => ({ ...prev, theme: { ...prev.theme, text: e.target.value } }))}
            />
          </label>
        </div>

        <h2>Pie de pagina</h2>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={values.poweredBy.enabled}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, poweredBy: { ...prev.poweredBy, enabled: e.target.checked } }))
            }
          />
          Mostrar leyenda "powered by"
        </label>

        {values.poweredBy.enabled && (
          <>
            <label htmlFor="poweredByText">Texto</label>
            <input
              id="poweredByText"
              value={values.poweredBy.text ?? ''}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, poweredBy: { ...prev.poweredBy, text: e.target.value } }))
              }
            />
          </>
        )}

        <div className="client-form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
