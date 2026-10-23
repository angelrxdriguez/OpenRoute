import type { ActivityTypeConfig } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';
import { haversineDistance } from '@/stats/geo';

/** Puntos con más incertidumbre horizontal que esto (m) se descartan. */
export const MAX_HORIZONTAL_ACCURACY = 25;

/**
 * Tras rechazar tantos saltos seguidos se acepta el siguiente punto: si el GPS insiste,
 * es que de verdad estamos ahí (p. ej. al recuperar señal) y no un rebote puntual.
 */
const MAX_CONSECUTIVE_JUMPS = 3;

/**
 * Filtra los puntos en bruto: quita los imprecisos, los duplicados y los saltos imposibles
 * para el tipo de actividad. Espera los puntos ordenados por tiempo.
 */
export function cleanTrack(points: TrackPoint[], config: ActivityTypeConfig): TrackPoint[] {
  const result: TrackPoint[] = [];
  let consecutiveJumps = 0;

  for (const point of points) {
    // iOS marca con precisión negativa las posiciones no válidas.
    if (point.accuracy != null && (point.accuracy < 0 || point.accuracy > MAX_HORIZONTAL_ACCURACY)) {
      continue;
    }

    const last = result[result.length - 1];
    if (last) {
      if (point.timestamp <= last.timestamp) continue;

      if (point.segment === last.segment) {
        const seconds = (point.timestamp - last.timestamp) / 1000;
        const impliedSpeed = haversineDistance(last, point) / seconds;
        if (impliedSpeed > config.maxPlausibleSpeed && consecutiveJumps < MAX_CONSECUTIVE_JUMPS) {
          consecutiveJumps++;
          continue;
        }
      }
    }

    consecutiveJumps = 0;
    result.push(point);
  }

  return result;
}
