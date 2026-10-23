import { ACTIVITY_TYPE_CONFIG, type ActivityType } from '@/domain/activity-types';
import type { ActivityStats, Split, TrackPoint } from '@/domain/models';
import { cleanTrack } from '@/stats/clean-track';
import { elevationChange, smoothAltitudes, usableAltitude } from '@/stats/elevation';
import { haversineDistance } from '@/stats/geo';

const SPLIT_DISTANCE = 1000;

/** Un último parcial más corto que esto (m) no se muestra. */
const MIN_PARTIAL_SPLIT = 50;

/** Velocidades consecutivas sobre las que se toma la mediana para la velocidad máxima. */
const MAX_SPEED_WINDOW = 3;

export type StatsRange = { startedAt: number; endedAt: number | null };

/**
 * Calcula las estadísticas de una actividad a partir de sus puntos en bruto.
 * Solo suma distancia y tiempo cuando te mueves por encima del umbral del tipo de actividad,
 * así que las paradas (semáforos, avituallamientos) no inflan la distancia ni bajan la media.
 */
export function computeStats(rawPoints: TrackPoint[], type: ActivityType, range?: StatsRange): ActivityStats {
  const config = ACTIVITY_TYPE_CONFIG[type];
  const points = cleanTrack(rawPoints, config);
  const altitudes = smoothAltitudes(points.map(usableAltitude));

  let distance = 0;
  let movingTime = 0;
  let maxSpeed = 0;
  const recentSpeeds: number[] = [];

  const splits: Split[] = [];
  let splitDistance = 0;
  let splitTime = 0;
  let lastAltitude = altitudes.find((a) => a != null) ?? null;
  let splitStartAltitude = lastAltitude;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    lastAltitude = altitudes[i] ?? lastAltitude;

    if (cur.segment !== prev.segment) {
      recentSpeeds.length = 0;
      continue;
    }

    const seconds = (cur.timestamp - prev.timestamp) / 1000;
    const meters = haversineDistance(prev, cur);
    // La velocidad Doppler del GPS es mucho más fiable que la derivada de dos posiciones.
    const speed = cur.speed != null && cur.speed >= 0 ? cur.speed : meters / seconds;

    recentSpeeds.push(speed);
    if (recentSpeeds.length > MAX_SPEED_WINDOW) recentSpeeds.shift();
    maxSpeed = Math.max(maxSpeed, median(recentSpeeds));

    if (speed < config.movingThreshold) continue;

    distance += meters;
    movingTime += seconds;

    let remainingMeters = meters;
    let remainingSeconds = seconds;
    while (splitDistance + remainingMeters >= SPLIT_DISTANCE) {
      const metersToBoundary = SPLIT_DISTANCE - splitDistance;
      const secondsToBoundary = remainingSeconds * (metersToBoundary / remainingMeters);
      splits.push({
        index: splits.length + 1,
        distance: SPLIT_DISTANCE,
        movingTime: splitTime + secondsToBoundary,
        elevationDelta: altitudeDelta(splitStartAltitude, lastAltitude),
      });
      splitStartAltitude = lastAltitude;
      remainingMeters -= metersToBoundary;
      remainingSeconds -= secondsToBoundary;
      splitDistance = 0;
      splitTime = 0;
    }
    splitDistance += remainingMeters;
    splitTime += remainingSeconds;
  }

  if (splitDistance >= MIN_PARTIAL_SPLIT) {
    splits.push({
      index: splits.length + 1,
      distance: splitDistance,
      movingTime: splitTime,
      elevationDelta: altitudeDelta(splitStartAltitude, lastAltitude),
    });
  }

  const { gain, loss } = elevationChange(altitudes);
  const knownAltitudes = altitudes.filter((a): a is number => a != null);

  return {
    distance,
    movingTime,
    elapsedTime: elapsedSeconds(points, range),
    avgSpeed: movingTime > 0 ? distance / movingTime : 0,
    maxSpeed,
    elevationGain: gain,
    elevationLoss: loss,
    minAltitude: knownAltitudes.length > 0 ? Math.min(...knownAltitudes) : null,
    maxAltitude: knownAltitudes.length > 0 ? Math.max(...knownAltitudes) : null,
    splits,
  };
}

function elapsedSeconds(points: TrackPoint[], range?: StatsRange): number {
  const start = range?.startedAt ?? points[0]?.timestamp;
  const end = range?.endedAt ?? points[points.length - 1]?.timestamp;
  if (start == null || end == null) return 0;
  return Math.max(0, (end - start) / 1000);
}

function altitudeDelta(from: number | null, to: number | null): number {
  return from != null && to != null ? to - from : 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
