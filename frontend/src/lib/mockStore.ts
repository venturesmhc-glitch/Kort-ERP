interface WithId {
  id: string;
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function readAll<T>(key: string, seed: T[]): T[] {
  const raw = localStorage.getItem(key);
  if (raw) {
    try {
      return JSON.parse(raw) as T[];
    } catch {
      // ignora datos corruptos y re-siembra
    }
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function writeAll<T>(key: string, items: T[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

/**
 * Coleccion mock respaldada en localStorage. Simula latencia de red y expone
 * la misma forma (list/create/update/remove) que tendra el servicio real, para
 * que reemplazar el mock por fetch sea un cambio de una sola linea en el api.ts
 * del modulo.
 */
export function createMockCollection<T extends WithId>(key: string, seed: T[]) {
  const storageKey = `kort-mock:${key}`;

  function list(): Promise<T[]> {
    return delay(readAll(storageKey, seed));
  }

  function get(id: string): Promise<T | undefined> {
    return delay(readAll(storageKey, seed).find((item) => item.id === id));
  }

  function create(input: Omit<T, 'id'>): Promise<T> {
    const items = readAll(storageKey, seed);
    const item = { ...input, id: crypto.randomUUID() } as T;
    writeAll(storageKey, [...items, item]);
    return delay(item);
  }

  function update(id: string, input: Partial<Omit<T, 'id'>>): Promise<T> {
    const items = readAll(storageKey, seed);
    const next = items.map((item) => (item.id === id ? { ...item, ...input } : item));
    writeAll(storageKey, next);
    const updated = next.find((item) => item.id === id);
    if (!updated) {
      throw new Error('Registro no encontrado');
    }
    return delay(updated);
  }

  function remove(id: string): Promise<void> {
    const items = readAll(storageKey, seed);
    writeAll(
      storageKey,
      items.filter((item) => item.id !== id)
    );
    return delay(undefined);
  }

  function replaceAll(items: T[]): Promise<T[]> {
    writeAll(storageKey, items);
    return delay(items);
  }

  return { list, get, create, update, remove, replaceAll };
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
