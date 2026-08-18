const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'kort-token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Forma de un issue de validacion Zod tal como lo manda errorHandler.ts del backend
// (res.status(400).json({ message, issues: err.issues })).
export interface ApiFieldIssue {
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  status: number;
  issues?: ApiFieldIssue[];

  constructor(message: string, status: number, issues?: ApiFieldIssue[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Error de red', response.status, data?.issues);
  }

  return data as T;
}

// Para endpoints multipart/form-data (ej. carga de imagenes) - apiRequest fuerza
// JSON, aca dejamos que el navegador arme el boundary del form-data solo.
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Error de red', response.status, data?.issues);
  }

  return data as T;
}

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = header?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallback;
}

// Para endpoints de exportacion (Excel/PDF, ver Reportes del Plan Integral):
// descarga el blob con el header de auth y dispara el guardado del navegador
// via un <a> temporal, ya que un <a href> directo no puede llevar el
// Authorization header.
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, { headers });

  if (!response.ok) {
    const data = await response.json().catch(() => undefined);
    throw new ApiError(data?.message ?? 'No se pudo generar el archivo', response.status, data?.issues);
  }

  const blob = await response.blob();
  const filename = filenameFromContentDisposition(
    response.headers.get('Content-Disposition'),
    fallbackFilename
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
