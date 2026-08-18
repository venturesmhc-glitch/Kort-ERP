import type { BusinessSettings } from '@kort/shared';

// Placeholder mientras se resuelve el primer fetch (o si el fetch falla): la
// landing no debe romper por falta de datos, solo se ve generica hasta que
// carga la config real desde /admin/negocio.
export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  name: 'Mi Barberia',
  tagline: '',
  logoUrl: '',
  headerImageUrl: '',
  footerImageUrl: '',
  poweredBy: { enabled: true, text: 'Sistema de gestion por Kort' },
  badge: { enabled: false, text: '', color: '', icon: '' },
  contact: {
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    hours: '',
    socials: { instagram: '', facebook: '', tiktok: '' },
  },
  theme: {
    primary: '#1d4ed8',
    secondary: '#0f172a',
    background: '#ffffff',
    text: '#1a1d21',
    accent: '#dc2626',
    mode: 'light',
  },
};
