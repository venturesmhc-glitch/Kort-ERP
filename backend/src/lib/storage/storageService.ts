import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';

export interface UploadableFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

// Abstraccion del proveedor de almacenamiento de imagenes (todavia sin definir
// en skills.md). Cambiar a S3/Cloudinary despues es escribir otra implementacion
// de esta interfaz, sin tocar el resto del codigo (ver LocalDiskStorageService).
export interface StorageService {
  uploadImage(file: UploadableFile): Promise<{ key: string; url: string }>;
  getImageUrl(key: string): string;
  deleteImage(key: string): Promise<void>;
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'articles');

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function extensionFor(mimeType: string, originalName: string): string {
  return path.extname(originalName) || EXTENSION_BY_MIME[mimeType] || '';
}

class LocalDiskStorageService implements StorageService {
  async uploadImage(file: UploadableFile) {
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const key = `${randomUUID()}${extensionFor(file.mimeType, file.originalName)}`;
    await writeFile(path.join(UPLOAD_DIR, key), file.buffer);

    return { key, url: this.getImageUrl(key) };
  }

  getImageUrl(key: string): string {
    return `${env.publicUrl}/uploads/articles/${key}`;
  }

  async deleteImage(key: string): Promise<void> {
    const filePath = path.join(UPLOAD_DIR, key);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  }
}

export const storageService: StorageService = new LocalDiskStorageService();

export function imageKeyFromUrl(url: string): string | null {
  const marker = '/uploads/articles/';
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}
