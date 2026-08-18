import { useBusinessSettings } from '../business-settings/BusinessSettingsContext';

function toWhatsappLink(whatsapp: string) {
  const digits = whatsapp.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

function SocialIcon({ kind }: { kind: 'instagram' | 'facebook' | 'tiktok' }) {
  if (kind === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  if (kind === 'facebook') {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.5 21v-7.6h2.6l.4-3H13.5V8.4c0-.9.25-1.5 1.55-1.5H16.6V4.2C16.3 4.15 15.3 4 14.1 4c-2.4 0-4 1.46-4 4.15v2.25H7.5v3h2.6V21h3.4z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.5 3c.4 2.2 1.9 3.7 4.1 3.9v2.9c-1.5 0-2.9-.5-4.1-1.4v6.7c0 3.3-2.7 5.9-5.9 5.9S4.7 18.4 4.7 15.1c0-3.2 2.5-5.8 5.7-5.9v3c-1.5.1-2.7 1.4-2.7 2.9 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9V3h3z"
      />
    </svg>
  );
}

export function ContactPage() {
  const { settings } = useBusinessSettings();
  const { name, contact } = settings;
  const { address, phone, whatsapp, email, hours, socials } = contact;
  const hasSocials = socials && (socials.instagram || socials.facebook || socials.tiktok);

  return (
    <div className="contact-page">
      <div className="page-header">
        <h1>Contacto y ubicacion</h1>
      </div>

      <div className="contact-layout">
        <div className="contact-info card">
          <h2>{name}</h2>

          {address && <p className="contact-row">{address}</p>}
          {phone && (
            <p className="contact-row">
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>{phone}</a>
            </p>
          )}
          {email && (
            <p className="contact-row">
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          )}
          {hours && <p className="contact-row text-muted">{hours}</p>}

          {whatsapp && (
            <a href={toWhatsappLink(whatsapp)} target="_blank" rel="noreferrer" className="button-primary whatsapp-button">
              Escribinos por WhatsApp
            </a>
          )}

          {hasSocials && (
            <div className="contact-socials">
              {socials?.instagram && (
                <a href={socials.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                  <SocialIcon kind="instagram" />
                </a>
              )}
              {socials?.facebook && (
                <a href={socials.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                  <SocialIcon kind="facebook" />
                </a>
              )}
              {socials?.tiktok && (
                <a href={socials.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
                  <SocialIcon kind="tiktok" />
                </a>
              )}
            </div>
          )}
        </div>

        {address && (
          <div className="contact-map">
            <iframe
              title="Ubicacion en el mapa"
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        )}
      </div>
    </div>
  );
}
