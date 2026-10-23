import type { TrackPoint } from '@/domain/models';

/** Metros que hay en un grado de latitud con el radio terrestre que usa `haversineDistance`. */
export const METERS_PER_DEGREE_LAT = (6_371_008.8 * Math.PI) / 180;

export const START = Date.UTC(2026, 9, 23, 8, 0, 0);

type Leg = {
  seconds: number;
  /** m/s hacia el norte. */
  speed: number;
  /** Metros que se suben (o bajan, si es negativo) a lo largo del tramo. */
  climb?: number;
  segment?: number;
  /** Segundos sin puntos antes del tramo, como durante una pausa manual. */
  gapBefore?: number;
  /** Amplitud (m) de un ruido vertical determinista que imita la altitud del GPS. */
  altitudeNoise?: number;
};

/**
 * Genera un punto por segundo avanzando hacia el norte. El primer punto está parado en el
 * origen y cada tramo añade `seconds` puntos, así que el tiempo total en movimiento es la suma
 * de los `seconds` de los tramos.
 */
export function buildTrack(legs: Leg[], startAt = START): TrackPoint[] {
  let timestamp = startAt;
  let latitude = 40.4168;
  let altitude = 650;
  let index = 0;

  const point = (leg: Leg): TrackPoint => ({
    segment: leg.segment ?? 0,
    timestamp,
    latitude,
    longitude: -3.7038,
    altitude: altitude + (leg.altitudeNoise ?? 0) * Math.sin(index++ * 1.7),
    accuracy: 5,
    altitudeAccuracy: 3,
    speed: leg.speed,
    heading: 0,
  });

  const points: TrackPoint[] = [point(legs[0])];
  for (const leg of legs) {
    timestamp += (leg.gapBefore ?? 0) * 1000;
    for (let s = 0; s < leg.seconds; s++) {
      timestamp += 1000;
      latitude += leg.speed / METERS_PER_DEGREE_LAT;
      altitude += (leg.climb ?? 0) / leg.seconds;
      points.push(point(leg));
    }
  }

  return points;
}
