import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

const port = Number(process.env.PORT ?? 4000);

export const env = {
  port,
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  // Lista separada por comas (ej. dominio de prod + previews de Vercel).
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Base publica del backend, usada para armar URLs de archivos servidos
  // estaticamente (ej. imagenes de articulos) cuando se usa LocalDiskStorageService.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
  // Opcionales: si estan las tres, StorageService usa Supabase Storage en vez
  // de disco local (necesario en Render, que tiene filesystem efimero).
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'article-images',
  // Mail transaccional (confirmacion de turno) via Resend. Sin
  // RESEND_API_KEY, EmailProvider cae a un no-op con log (mismo
  // comportamiento que antes de esta integracion).
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
  // WhatsApp Business Cloud API (recordatorio de turno 6hs antes). Requiere
  // una cuenta de Meta Business verificada y una plantilla de mensaje ya
  // aprobada (los mensajes que la empresa inicia fuera de una conversacion
  // abierta deben usar plantilla) - ese alta es un paso manual e inevitable
  // del lado de Meta, no de este codigo. Sin WHATSAPP_TOKEN, WhatsappProvider
  // cae a un no-op con log.
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappReminderTemplate: process.env.WHATSAPP_REMINDER_TEMPLATE ?? 'recordatorio_turno',
  whatsappTemplateLang: process.env.WHATSAPP_TEMPLATE_LANG ?? 'es_AR',
  // Cliente.phone se carga a mano (sin formato forzado, ver clients.schema.ts)
  // - se usa para anteponer el codigo de pais cuando el numero no lo trae.
  whatsappDefaultCountryCode: process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '54',
};
