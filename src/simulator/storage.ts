/**
 * `localStorage` del navegador, que puede fallar (ventana privada, datos bloqueados…).
 * El simulador funciona igual sin él: solo pierde lo guardado al recargar.
 */
export function readJson<T>(key: string): T | null {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento disponible: no pasa nada.
  }
}
