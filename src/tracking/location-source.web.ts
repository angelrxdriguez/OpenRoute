import { startEmitting, stopEmitting, useSimulatorStore } from '@/simulator/simulator';
import type { GpsPreview } from '@/tracking/location-types';

/**
 * En el navegador, el GPS es el simulador (ver `docs/pruebas-en-chrome.md`). Mismas funciones
 * que `location-source.ts`; las lecturas llegan por `location-task.web.ts`.
 */

export async function ensurePermissions(): Promise<void> {}

export async function startLocationUpdates(): Promise<void> {
  startEmitting();
}

export async function stopLocationUpdates(): Promise<void> {
  stopEmitting();
}

export function watchPreviewPosition(onChange: (preview: GpsPreview) => void): () => void {
  const emit = () => {
    const { position } = useSimulatorStore.getState();
    onChange({ status: 'ready', latitude: position.latitude, longitude: position.longitude, accuracy: 5 });
  };
  emit();
  return useSimulatorStore.subscribe((next, previous) => {
    if (next.position !== previous.position) emit();
  });
}
