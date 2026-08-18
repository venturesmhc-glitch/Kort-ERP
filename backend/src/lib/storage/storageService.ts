import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StorageClient } from '@supabase/storage-js';
import { env } from '../../config/env.js';

export interface UploadableFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

// Abstraccion del proveedor de almacenamiento de imagenes: LocalDiskStorageService
// para desarrollo, SupabaseStorageService para produccion (Render tiene filesystem
// efimero, un disco local ahi pierde los archivos en cada deploy/restart).
export interface StorageService {
  uploadImage(file: UploadableFile): Promise<{ key: string; url: string }>;
  getImageUrl(key: string): string;
  deleteImage(key: string): Promise<void>;
  // Recupera la key (nombre de archivo) a partir de una URL previamente
  // devuelta por uploadImage, para poder borrar la imagen anterior al
  // reemplazarla. Cada implementacion arma URLs distintas, asi que el
  // parseo es especifico de cada una.
  keyFromUrl(url: string): string | null;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Whitelist de mimetypes de imagen aceptados para upload. Deliberadamente sin
// image/svg+xml: un SVG es XML y puede llevar <script> embebido, asi que
// servirlo tal cual desde storage (estatico) es un vector de XSS almacenado.
export const ALLOWED_IMAGE_MIME_TYPES = Object.keys(EXTENSION_BY_MIME);

// La extension sale siempre del mimetype, nunca del nombre original del
// archivo (controlado por el cliente): si se tomara de ahi, un archivo con
// mimetype image/* pero nombre "x.svg"/"x.html" quedaria guardado y servido
// con esa extension, habilitando XSS almacenado. Un mimetype fuera del
// whitelist no deberia llegar aca (ver fileFilter en articles.routes.ts),
// pero si pasa devolvemos '' antes que confiar en el nombre del cliente.
function extensionFor(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? '';
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'articles');
const LOCAL_URL_MARKER = '/uploads/articles/';

class LocalDiskStorageService implements StorageService {
  async uploadImage(file: UploadableFile) {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const key = `${randomUUID()}${extensionFor(file.mimeType)}`;
    await writeFile(path.join(UPLOAD_DIR, key), file.buffer);

    return { key, url: this.getImageUrl(key) };
  }

  getImageUrl(key: string): string {
    return `${env.publicUrl}${LOCAL_URL_MARKER}${key}`;
  }

  async deleteImage(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }

  keyFromUrl(url: string): string | null {
    const index = url.indexOf(LOCAL_URL_MARKER);
    return index === -1 ? null : url.slice(index + LOCAL_URL_MARKER.length);
  }
}

class SupabaseStorageService implements StorageService {
  // StorageClient standalone (sin Auth/Realtime, que en supabase-js completo
  // requieren Node 22+ para WebSocket nativo; Render corre Node 20).
  private client = new StorageClient(`${env.supabaseUrl}/storage/v1`, {
    apikey: env.supabaseServiceRoleKey!,
    Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
  });
  private bucket = env.supabaseStorageBucket;
  private urlMarker = `/storage/v1/object/public/${env.supabaseStorageBucket}/`;

  async uploadImage(file: UploadableFile) {
    const key = `${randomUUID()}${extensionFor(file.mimeType)}`;
    const { error } = await this.client.from(this.bucket).upload(key, file.buffer, {
      contentType: file.mimeType,
      upsert: false,
    });
    if (error) {
      throw new Error(`No se pudo subir la imagen a Supabase Storage: ${error.message}`);
    }

    return { key, url: this.getImageUrl(key) };
  }

  getImageUrl(key: string): string {
    return this.client.from(this.bucket).getPublicUrl(key).data.publicUrl;
  }

  async deleteImage(key: string): Promise<void> {
    await this.client.from(this.bucket).remove([key]);
  }

  keyFromUrl(url: string): string | null {
    const index = url.indexOf(this.urlMarker);
    return index === -1 ? null : url.slice(index + this.urlMarker.length);
  }
}

// Si estan configuradas las credenciales de Supabase, se usa ese backend
// (requerido en Render por el filesystem efimero); si no, disco local (dev).
export const storageService: StorageService =
  env.supabaseUrl && env.supabaseServiceRoleKey
    ? new SupabaseStorageService()
    : new LocalDiskStorageService();

export function imageKeyFromUrl(url: string): string | null {
  return storageService.keyFromUrl(url);
}
