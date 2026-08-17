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
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  // Base publica del backend, usada para armar URLs de archivos servidos
  // estaticamente (ej. imagenes de articulos). Ver StorageService.
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${port}`,
};
