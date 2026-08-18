import type { BusinessSettings as BusinessSettingsRow, Role } from '@prisma/client';
import type { BusinessSettings } from '@kort/shared';
import { prisma } from '../../lib/prisma.js';
import { imageKeyFromUrl, storageService } from '../../lib/storage/storageService.js';
import type { UploadableFile } from '../../lib/storage/storageService.js';

export const BUSINESS_IMAGE_FIELDS = ['logo', 'header', 'footer'] as const;
export type BusinessImageField = (typeof BUSINESS_IMAGE_FIELDS)[number];

const IMAGE_COLUMN_BY_FIELD = {
  logo: 'logoUrl',
  header: 'headerImageUrl',
  footer: 'footerImageUrl',
} as const satisfies Record<BusinessImageField, keyof BusinessSettingsRow>;

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

// La leyenda "powered by" es una configuracion exclusiva de Dev (marca del
// sistema, no del negocio): si quien edita no es Dev, se ignora cualquier
// cambio a esos campos y se conserva el valor que ya estaba en la fila,
// sin importar lo que venga en el body. El frontend tambien oculta el
// control para Encargado, pero la verificacion real es esta (no confiar
// solo en el frontend).
export async function updateBusinessSettings(
  input: BusinessSettings,
  role: Role
): Promise<BusinessSettings> {
  const data = fromConfig(input);

  if (role !== 'DEV') {
    const current = await prisma.businessSettings.findUnique({ where: { id: 1 } });
    data.poweredByEnabled = current?.poweredByEnabled ?? data.poweredByEnabled;
    data.poweredByText = current?.poweredByText ?? data.poweredByText;
  }

  const row = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return toConfig(row);
}

// Mismo patron que uploadArticleImage (ver articles.service.ts): sube la
// imagen nueva, actualiza la fila unica de BusinessSettings y recien
// despues borra la anterior (si habia), para no perder la imagen vieja si
// el update a la fila fallara.
export async function uploadBusinessImage(
  field: BusinessImageField,
  file: UploadableFile
): Promise<BusinessSettings> {
  const column = IMAGE_COLUMN_BY_FIELD[field];
  const current = await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1 },
    update: {},
  });
  const previousUrl = current[column] as string | null;
  const previousKey = previousUrl ? imageKeyFromUrl(previousUrl) : null;

  const { url } = await storageService.uploadImage(file);
  const updated = await prisma.businessSettings.update({
    where: { id: 1 },
    data: { [column]: url },
  });

  if (previousKey) {
    await storageService.deleteImage(previousKey);
  }

  return toConfig(updated);
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
