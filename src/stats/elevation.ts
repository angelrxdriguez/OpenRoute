import type { TrackPoint } from '@/domain/models';

/** Altitudes con más incertidumbre vertical que esto (m) se ignoran. */
export const MAX_VERTICAL_ACCURACY = 20;

/** Variaciones menores que esto (m) se consideran ruido del GPS y no suman desnivel. */
export const ELEVATION_THRESHOLD = 3;

/** Puntos que entran en la media móvil (centrada) al suavizar. */
const SMOOTHING_WINDOW = 5;

export function usableAltitude(point: TrackPoint): number | null {
  if (point.altitude == null) return null;
  if (point.altitudeAccuracy != null && (point.altitudeAccuracy < 0 || point.altitudeAccuracy > MAX_VERTICAL_ACCURACY)) {
    return null;
  }
  return point.altitude;
}

/** Media móvil centrada que ignora los huecos (null) sin rellenarlos. */
export function smoothAltitudes(values: (number | null)[], window = SMOOTHING_WINDOW): (number | null)[] {
  const half = Math.floor(window / 2);
  return values.map((value, i) => {
    if (value == null) return null;
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(values.length - 1, i + half); j++) {
      const neighbour = values[j];
      if (neighbour != null) {
        sum += neighbour;
        count++;
      }
    }
    return sum / count;
  });
}

/**
 * Ascenso y descenso acumulados con histéresis: solo cuenta un cambio cuando se aleja
 * más de `threshold` metros de la última altitud de referencia.
 */
export function elevationChange(
  altitudes: (number | null)[],
  threshold = ELEVATION_THRESHOLD,
): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  let reference: number | null = null;

  for (const altitude of altitudes) {
    if (altitude == null) continue;
    if (reference == null) {
      reference = altitude;
      continue;
    }
    const diff = altitude - reference;
    if (diff >= threshold) {
      gain += diff;
      reference = altitude;
    } else if (diff <= -threshold) {
      loss -= diff;
      reference = altitude;
    }
  }

  return { gain, loss };
}
