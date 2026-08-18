import { z } from 'zod';

// Datos de marca/contacto de la landing publica de cada instalacion (nombre,
// tagline, contacto, tema). Antes vivian hardcodeados en el frontend
// (business.config.ts) - eso rompia multi-tenant, porque cambiar el negocio
// implicaba tocar codigo y redeployar. Ahora es una fila de configuracion en
// el backend (ver business-settings.service.ts), editable desde
// /admin/negocio, y este schema se comparte entre el form del frontend y la
// validacion del backend para que no diverjan.
export const businessSocialsSchema = z.object({
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
});

export const businessContactSchema = z.object({
  address: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Ingresa un email valido').optional().or(z.literal('')),
  hours: z.string().optional(),
  socials: businessSocialsSchema.optional(),
});

export const businessThemeSchema = z.object({
  primary: z.string().min(1, 'Requerido'),
  secondary: z.string().min(1, 'Requerido'),
  background: z.string().min(1, 'Requerido'),
  text: z.string().min(1, 'Requerido'),
  accent: z.string().min(1, 'Requerido'),
  mode: z.enum(['light', 'dark']),
});

export const businessBadgeSchema = z.object({
  enabled: z.boolean(),
  text: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export const businessPoweredBySchema = z.object({
  enabled: z.boolean(),
  text: z.string().optional(),
});

export const businessSettingsSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  headerImageUrl: z.string().optional(),
  footerImageUrl: z.string().optional(),
  poweredBy: businessPoweredBySchema,
  badge: businessBadgeSchema,
  contact: businessContactSchema,
  theme: businessThemeSchema,
});

export type BusinessSettings = z.infer<typeof businessSettingsSchema>;
