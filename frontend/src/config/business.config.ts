// Configuracion parametrizable del local publico. Para adaptar la landing a otro
// tenant/rubro, alcanza con editar los valores de `businessConfig` (no hace falta
// tocar los componentes). Los campos de contacto/redes son opcionales: si no se
// completan, la UI los oculta en vez de dejar un hueco vacio.

export interface BusinessBadge {
  enabled: boolean;
  text: string;
  color: string;
  icon?: string;
}

export interface BusinessSocials {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
}

export interface BusinessContact {
  address?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  hours?: string;
  socials?: BusinessSocials;
}

export interface BusinessTheme {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  mode: 'light' | 'dark';
}

export interface BusinessConfig {
  name: string;
  tagline: string;
  logoUrl?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  poweredBy: { enabled: boolean; text: string };
  badge: BusinessBadge;
  contact: BusinessContact;
  theme: BusinessTheme;
}

// Datos de ejemplo (placeholder) para un tenant distinto al de referencia,
// pensados solo para demostrar que la plantilla es parametrizable.
export const businessConfig: BusinessConfig = {
  name: 'Norte Barber Studio',
  tagline: 'Cortes clasicos y de autor en el corazon del barrio',
  logoUrl: '',
  headerImageUrl: '',
  footerImageUrl: '',
  poweredBy: { enabled: true, text: 'Sistema de gestion por Kort' },
  badge: { enabled: true, text: 'Top Rated', color: '#d4af37', icon: 'star' },
  contact: {
    address: 'Av. Belgrano 1420, Rosario, Santa Fe',
    phone: '+54 341 555-0142',
    whatsapp: '+543415550142',
    email: 'hola@nortebarber.com.ar',
    hours: 'Lun a Sab de 10:00 a 20:00',
    socials: {
      instagram: 'https://instagram.com/nortebarberstudio',
      facebook: '',
      tiktok: '',
    },
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
