import { readJson, writeJson } from '@/simulator/storage';

/**
 * Reloj del entorno de pruebas. Con el simulador a ×60, un minuto real son 60 minutos
 * para la app, así que una ruta de una hora se prueba en un minuto y las estadísticas
 * (tiempos, velocidades) siguen saliendo como en la realidad.
 *
 * Solo avanza más rápido mientras el GPS simulado emite. El adelanto acumulado respecto
 * a la hora real se guarda para que una grabación siga cuadrando al recargar la página.
 */
const STORAGE_KEY = 'openroute.simulator.clock';

let realAnchor = Date.now();
let virtualAnchor = realAnchor + (readJson<number>(STORAGE_KEY) ?? 0);
let rate = 1;

export function now(): number {
  return virtualAnchor + (Date.now() - realAnchor) * rate;
}

export function getRate(): number {
  return rate;
}

export function setRate(next: number): void {
  const current = now();
  realAnchor = Date.now();
  virtualAnchor = current;
  rate = next;
  saveOffset();
}

/** Milisegundos que el reloj va por delante de la hora real. */
export function getOffset(): number {
  return now() - Date.now();
}

export function saveOffset(): void {
  writeJson(STORAGE_KEY, getOffset());
}

/** Vuelve a la hora real. Solo tiene sentido sin una grabación en curso. */
export function resetOffset(): void {
  realAnchor = Date.now();
  virtualAnchor = realAnchor;
  saveOffset();
}
