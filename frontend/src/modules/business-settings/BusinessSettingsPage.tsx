import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { BusinessSettings } from '@kort/shared';
import { useBusinessSettings } from './BusinessSettingsContext';
import {
  updateBusinessSettingsRequest,
  uploadBusinessImageRequest,
  type BusinessImageField,
} from './business-settings.api';
import { useToast } from '../../components/toast/ToastProvider';
import { ApiError } from '../../lib/apiClient';
import { getErrorMessage, getFieldError, type FieldIssue } from '../../lib/apiErrors';
import { PageSkeleton } from '../../components/AsyncState';
import { Toggle } from '../../components/Toggle';
import { useAuth } from '../auth/AuthContext';

interface ImageUploadFieldProps {
  label: string;
  currentUrl: string | undefined;
  uploading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
}

function ImageUploadField({ label, currentUrl, uploading, onSelect, onRemove }: ImageUploadFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onSelect(file);
  }

  return (
    <div className="image-upload-field">
      <label>{label}</label>
      {currentUrl ? (
        <div className="image-upload-preview-wrap">
          <img src={currentUrl} alt={label} className="image-upload-preview" />
          <button
            type="button"
            className="image-upload-remove"
            onClick={onRemove}
            disabled={uploading}
            aria-label={`Quitar ${label}`}
            title={`Quitar ${label}`}
          >
            ×
          </button>
        </div>
      ) : (
        <p className="text-muted">Sin imagen configurada.</p>
      )}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleChange} disabled={uploading} />
      {uploading && <span className="text-muted">Subiendo...</span>}
    </div>
  );
}

export function BusinessSettingsPage() {
  const { settings, loading, refresh } = useBusinessSettings();
  const { user } = useAuth();
  const isDev = user?.role === 'DEV';
  const toast = useToast();
  const [values, setValues] = useState<BusinessSettings>(settings);
  const [seeded, setSeeded] = useState(false);
  const [issues, setIssues] = useState<FieldIssue[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<BusinessImageField, boolean>>({
    logo: false,
    header: false,
    footer: false,
  });

  async function handleImageUpload(field: BusinessImageField, file: File) {
    setUploading((prev) => ({ ...prev, [field]: true }));
    try {
      const updated = await uploadBusinessImageRequest(field, file);
      setValues((prev) => ({
        ...prev,
        logoUrl: updated.logoUrl,
        headerImageUrl: updated.headerImageUrl,
        footerImageUrl: updated.footerImageUrl,
      }));
      await refresh();
      toast.success('Imagen actualizada');
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo subir la imagen'));
    } finally {
      setUploading((prev) => ({ ...prev, [field]: false }));
    }
  }

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
    return <PageSkeleton />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Datos del negocio</h1>
      </div>
      <p className="text-muted">
        Nombre, contacto y colores de marca que se muestran en la landing publica (inicio, turnos,
        tienda y contacto) y en el encabezado de los reportes en PDF y Excel.
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

        <ImageUploadField
          label="Logo (opcional)"
          currentUrl={values.logoUrl}
          uploading={uploading.logo}
          onSelect={(file) => handleImageUpload('logo', file)}
          onRemove={() => setValues((prev) => ({ ...prev, logoUrl: '' }))}
        />
        <ImageUploadField
          label="Imagen de portada (opcional)"
          currentUrl={values.headerImageUrl}
          uploading={uploading.header}
          onSelect={(file) => handleImageUpload('header', file)}
          onRemove={() => setValues((prev) => ({ ...prev, headerImageUrl: '' }))}
        />
        <ImageUploadField
          label="Imagen de pie (opcional)"
          currentUrl={values.footerImageUrl}
          uploading={uploading.footer}
          onSelect={(file) => handleImageUpload('footer', file)}
          onRemove={() => setValues((prev) => ({ ...prev, footerImageUrl: '' }))}
        />

        <details className="business-settings-url-fallback">
          <summary>O pegar una URL externa en vez de subir un archivo</summary>
          <p className="text-muted">
            Queda a tu cargo que la URL sea estable en el tiempo (ej. no se recomienda usar links
            de servicios que puedan borrarla).
          </p>

          <label htmlFor="logoUrl">URL del logo</label>
          <input
            id="logoUrl"
            value={values.logoUrl ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, logoUrl: e.target.value }))}
          />

          <label htmlFor="headerImageUrl">URL de imagen de portada</label>
          <input
            id="headerImageUrl"
            value={values.headerImageUrl ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, headerImageUrl: e.target.value }))}
          />

          <label htmlFor="footerImageUrl">URL de imagen de pie</label>
          <input
            id="footerImageUrl"
            value={values.footerImageUrl ?? ''}
            onChange={(e) => setValues((prev) => ({ ...prev, footerImageUrl: e.target.value }))}
          />
        </details>

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

        <label htmlFor="taxId">CUIT (opcional)</label>
        <input
          id="taxId"
          value={values.contact.taxId ?? ''}
          placeholder="30-12345678-9"
          onChange={(e) => setValues((prev) => ({ ...prev, contact: { ...prev.contact, taxId: e.target.value } }))}
        />
        <p className="text-muted">Se muestra en el encabezado de los reportes en PDF y Excel.</p>

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

        <div className="checkbox-field">
          <Toggle
            checked={values.badge.enabled}
            onChange={(enabled) => setValues((prev) => ({ ...prev, badge: { ...prev.badge, enabled } }))}
            label="Mostrar badge"
          />
          <span>Mostrar badge</span>
        </div>

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

        {isDev && (
          <>
            <h2>Pie de pagina</h2>

            <div className="checkbox-field">
              <Toggle
                checked={values.poweredBy.enabled}
                onChange={(enabled) => setValues((prev) => ({ ...prev, poweredBy: { ...prev.poweredBy, enabled } }))}
                label='Mostrar leyenda "powered by"'
              />
              <span>Mostrar leyenda "powered by"</span>
            </div>

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
