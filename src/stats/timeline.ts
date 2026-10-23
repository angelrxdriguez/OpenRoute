import type { ActivityTypeConfig } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';
import { cleanTrack } from '@/stats/clean-track';
import { smoothAltitudes, usableAltitude } from '@/stats/elevation';
import { haversineDistance } from '@/stats/geo';

/**
 * Entre dos lecturas más separadas que esto (s) no se usa la velocidad del GPS sino la media del
 * hueco: tras un corte de señal o una pausa automática, la velocidad del punto que llega no dice
 * nada de lo que pasó en medio.
 */
export const MAX_DOPPLER_GAP = 5;

/** Un punto de la actividad ya filtrado, con lo acumulado hasta él. */
export type TimelineSample = {
  point: TrackPoint;
  /** Altitud suavizada; null si el GPS no la dio o era poco fiable. */
  altitude: number | null;
  /** Metros en movimiento desde el inicio. */
  distance: number;
  /** Segundos en movimiento desde el inicio. */
  movingTime: number;
  /** Velocidad (m/s) del paso que acaba en este punto; 0 en el primero de cada tramo. */
  speed: number;
  /** Si ese paso cuenta como movimiento (supera el umbral de la actividad). */
  moving: boolean;
};

/** Velocidad de un paso: la del GPS (efecto Doppler), mucho más fiable que la derivada de dos posiciones, salvo tras un hueco. */
export function stepSpeed(point: TrackPoint, meters: number, seconds: number): number {
  if (seconds <= MAX_DOPPLER_GAP && point.speed != null && point.speed >= 0) return point.speed;
  return seconds > 0 ? meters / seconds : 0;
}

/**
 * Recorre los puntos filtrados y acumula distancia y tiempo solo en los pasos en movimiento, así
 * que las paradas (semáforos, avituallamientos) no suman. Es la base de las estadísticas, las
 * gráficas y la repetición, para que todas cuenten lo mismo.
 */
export function buildTimeline(rawPoints: TrackPoint[], config: ActivityTypeConfig): TimelineSample[] {
  const points = cleanTrack(rawPoints, config);
  const altitudes = smoothAltitudes(points.map(usableAltitude));

  let distance = 0;
  let movingTime = 0;
  return points.map((point, i) => {
    const prev = points[i - 1];
    let speed = 0;
    let moving = false;
    // El primer paso de cada tramo no cuenta: no sabemos qué pasó durante la pausa manual.
    if (prev && prev.segment === point.segment) {
      const seconds = (point.timestamp - prev.timestamp) / 1000;
      const meters = haversineDistance(prev, point);
      speed = stepSpeed(point, meters, seconds);
      moving = speed >= config.movingThreshold;
      if (moving) {
        distance += meters;
        movingTime += seconds;
      }
    }
    return { point, altitude: altitudes[i], distance, movingTime, speed, moving };
  });
}
