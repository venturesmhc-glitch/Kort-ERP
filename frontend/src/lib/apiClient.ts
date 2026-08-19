const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'kort-token';

// El backend esta en Render plan free: si no tuvo trafico en ~15 min el
// servicio "duerme" y la primera request tarda 30-50s en responder mientras
// arranca de nuevo. 60s da margen a ese cold start sin dejar una request
// colgada para siempre si el backend esta realmente caido.
const REQUEST_TIMEOUT_MS = 60_000;

// status 0 identifica errores de red/timeout (no una respuesta HTTP real),
// asi la UI puede distinguir "credenciales invalidas" de "el backend esta
// arrancando o no responde" y mostrar un mensaje/retry acorde.
export function isColdStartError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 0;
}

async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        'El sistema esta iniciando y tardo demasiado en responder. Espera unos segundos y volve a intentar.',
        0
      );
    }
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexion e intenta de nuevo.', 0);
  } finally {
    clearTimeout(timer);
  }
}

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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

  const response = await fetchWithTimeout(`${API_URL}${path}`, {
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

  const response = await fetchWithTimeout(`${API_URL}${path}`, {
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

  const response = await fetchWithTimeout(`${API_URL}${path}`, { headers });

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
