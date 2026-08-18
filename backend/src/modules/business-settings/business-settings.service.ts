import type { BusinessSettings as BusinessSettingsRow } from '@prisma/client';
import type { BusinessSettings } from '@kort/shared';
import { prisma } from '../../lib/prisma.js';

// Fila unica (id fijo en 1), mismo patron que OrganizationSettings. El upsert
// evita depender de un seed: la primera lectura ya crea la fila con los
// valores por defecto del schema.
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  return toConfig(row);
}

export async function updateBusinessSettings(input: BusinessSettings): Promise<BusinessSettings> {
  const data = fromConfig(input);
  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return toConfig(row);
}

function toConfig(row: BusinessSettingsRow): BusinessSettings {
  return {
    name: row.name,
    tagline: row.tagline,
    logoUrl: row.logoUrl ?? '',
    headerImageUrl: row.headerImageUrl ?? '',
    footerImageUrl: row.footerImageUrl ?? '',
    poweredBy: { enabled: row.poweredByEnabled, text: row.poweredByText },
    badge: {
      enabled: row.badgeEnabled,
      text: row.badgeText ?? '',
      color: row.badgeColor ?? '',
      icon: row.badgeIcon ?? '',
    },
    contact: {
      address: row.contactAddress ?? '',
      phone: row.contactPhone ?? '',
      whatsapp: row.contactWhatsapp ?? '',
      email: row.contactEmail ?? '',
      hours: row.contactHours ?? '',
      socials: {
        instagram: row.socialInstagram ?? '',
        facebook: row.socialFacebook ?? '',
        tiktok: row.socialTiktok ?? '',
      },
    },
    theme: {
      primary: row.themePrimary,
      secondary: row.themeSecondary,
      background: row.themeBackground,
      text: row.themeText,
      accent: row.themeAccent,
      mode: row.themeMode === 'dark' ? 'dark' : 'light',
    },
  };
}

function fromConfig(input: BusinessSettings) {
  return {
    name: input.name,
    tagline: input.tagline ?? '',
    logoUrl: input.logoUrl || null,
    headerImageUrl: input.headerImageUrl || null,
    footerImageUrl: input.footerImageUrl || null,
    poweredByEnabled: input.poweredBy.enabled,
    poweredByText: input.poweredBy.text ?? '',
    badgeEnabled: input.badge.enabled,
    badgeText: input.badge.text || null,
    badgeColor: input.badge.color || null,
    badgeIcon: input.badge.icon || null,
    contactAddress: input.contact.address || null,
    contactPhone: input.contact.phone || null,
    contactWhatsapp: input.contact.whatsapp || null,
    contactEmail: input.contact.email || null,
    contactHours: input.contact.hours || null,
    socialInstagram: input.contact.socials?.instagram || null,
    socialFacebook: input.contact.socials?.facebook || null,
    socialTiktok: input.contact.socials?.tiktok || null,
    themePrimary: input.theme.primary,
    themeSecondary: input.theme.secondary,
    themeBackground: input.theme.background,
    themeText: input.theme.text,
    themeAccent: input.theme.accent,
    themeMode: input.theme.mode,
  };
}
