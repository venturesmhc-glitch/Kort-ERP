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
};
