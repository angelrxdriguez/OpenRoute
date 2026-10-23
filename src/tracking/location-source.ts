import * as Location from 'expo-location';

import { LocationPermissionError, type GpsPreview } from '@/tracking/location-types';

/**
 * GPS del iPhone. En el navegador se usa `location-source.web.ts`, que tira del simulador.
 * Las lecturas no llegan por aquí sino por la tarea de `location-task.ts`.
 */

export const LOCATION_TASK = 'openroute-location';

/**
 * Basta con el permiso «Al usar la app»: con el modo de segundo plano de localización, iOS
 * sigue dando posiciones con la pantalla bloqueada si la grabación empezó con la app abierta.
 */
export async function ensurePermissions(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationPermissionError();
}

export async function startLocationUpdates(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    activityType: Location.ActivityType.Fitness,
    distanceInterval: 0,
    // iOS no debe cortar el GPS por su cuenta aunque estés parado un rato.
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });
}

export async function stopLocationUpdates(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}

/** Sigue tu posición mientras eliges actividad. Devuelve la función para dejar de seguirla. */
export function watchPreviewPosition(onChange: (preview: GpsPreview) => void): () => void {
  let cancelled = false;
  let subscription: Location.LocationSubscription | null = null;

  (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (cancelled) return;
    if (status !== 'granted') {
      onChange({ status: 'denied' });
      return;
    }
    subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 0 },
      ({ coords }) => {
        onChange({ status: 'ready', latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
      },
    );
    if (cancelled) subscription.remove();
  })().catch((error: unknown) => {
    console.warn('[OpenRoute] No se pudo seguir la posición', error);
  });

  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
