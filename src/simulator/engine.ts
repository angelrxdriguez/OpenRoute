import type { LocationObject } from 'expo-location';

import type { ActivityType } from '@/domain/activity-types';
import { haversineDistance } from '@/stats/geo';

/**
 * Motor del simulador de GPS: mueve a alguien por una ruta a la velocidad típica de cada
 * actividad (más despacio cuesta arriba) y genera lecturas como las del GPS del iPhone,
 * una por segundo y con un poco de error. Son funciones puras para poder probarlas.
 */

export type RoutePoint = { latitude: number; longitude: number; altitude: number | null };

export type PreparedRoute = {
  points: RoutePoint[];
  /** Distancia acumulada (m) desde el inicio hasta cada punto. */
  cumulative: number[];
  /** Longitud total en metros. */
  total: number;
};

export type RoutePosition = RoutePoint & { heading: number };

export type Rider = {
  /** Metros recorridos sobre la ruta. */
  distance: number;
  /** Segundos simulados desde el inicio; da variedad al ritmo. */
  elapsed: number;
  /** Parado a propósito (un semáforo, un avituallamiento…). */
  stopped: boolean;
  /** Error del GPS en metros. Va a la deriva poco a poco, como el real, en vez de saltar. */
  noise: { east: number; north: number; up: number };
};

export type Random = () => number;

const METERS_PER_DEGREE_LAT = (6_371_008.8 * Math.PI) / 180;

/** Tramo (m) sobre el que se mide la pendiente. */
const GRADE_WINDOW = 30;

/**
 * Velocidad en llano (m/s) y cuánto la cambia la pendiente: con `climb` 9, una subida del 4 %
 * deja la velocidad en un 64 %. `min` y `max` acotan ese factor en subidas y bajadas fuertes.
 */
const SPEED_PROFILE: Record<ActivityType, { flat: number; climb: number; min: number; max: number }> = {
  road_bike: { flat: 7.5, climb: 9, min: 0.35, max: 1.7 },
  mtb: { flat: 5, climb: 8, min: 0.35, max: 1.5 },
  run: { flat: 3, climb: 4, min: 0.6, max: 1.25 },
  walk: { flat: 1.35, climb: 3, min: 0.6, max: 1.2 },
};

export function prepareRoute(points: RoutePoint[]): PreparedRoute {
  const unique = points.filter(
    (point, i) => i === 0 || point.latitude !== points[i - 1].latitude || point.longitude !== points[i - 1].longitude,
  );
  const cumulative = [0];
  for (let i = 1; i < unique.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineDistance(unique[i - 1], unique[i]));
  }
  return { points: unique, cumulative, total: cumulative[cumulative.length - 1] ?? 0 };
}

/** Posición a `distance` metros del inicio, interpolada entre los puntos de la ruta. */
export function positionAt(route: PreparedRoute, distance: number): RoutePosition {
  const { points, cumulative, total } = route;
  if (points.length === 1) return { ...points[0], heading: 0 };

  const d = Math.min(Math.max(distance, 0), total);
  // Último punto cuyo acumulado no pasa de `d` (búsqueda binaria).
  let low = 0;
  let high = points.length - 2;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (cumulative[mid] <= d) low = mid;
    else high = mid - 1;
  }

  const from = points[low];
  const to = points[low + 1];
  const length = cumulative[low + 1] - cumulative[low];
  const t = length > 0 ? (d - cumulative[low]) / length : 0;

  return {
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    longitude: from.longitude + (to.longitude - from.longitude) * t,
    altitude:
      from.altitude != null && to.altitude != null
        ? from.altitude + (to.altitude - from.altitude) * t
        : (from.altitude ?? to.altitude),
    heading: bearing(from, to),
  };
}

/** Pendiente (tanto por uno) alrededor de `distance`. Sin altitudes, llano. */
export function gradeAt(route: PreparedRoute, distance: number): number {
  const half = GRADE_WINDOW / 2;
  const start = Math.max(0, distance - half);
  const end = Math.min(route.total, distance + half);
  if (end - start < 1) return 0;
  const a = positionAt(route, start).altitude;
  const b = positionAt(route, end).altitude;
  return a != null && b != null ? (b - a) / (end - start) : 0;
}

/** Velocidad (m/s) a la que iría alguien haciendo `type` con esa pendiente. */
export function cruisingSpeed(type: ActivityType, grade: number, elapsedSeconds: number): number {
  const profile = SPEED_PROFILE[type];
  const slope = Math.min(Math.max(1 - profile.climb * grade, profile.min), profile.max);
  // Un vaivén suave para que el ritmo no sea perfectamente constante.
  const wobble = 1 + 0.06 * Math.sin(elapsedSeconds / 37) + 0.03 * Math.sin(elapsedSeconds / 11);
  return profile.flat * slope * wobble;
}

export function createRider(distance = 0): Rider {
  return { distance, elapsed: 0, stopped: false, noise: { east: 0, north: 0, up: 0 } };
}

export function isFinished(route: PreparedRoute, rider: Rider): boolean {
  return rider.distance >= route.total;
}

/** Avanza un segundo y devuelve la lectura del GPS en ese instante. */
export function stepRider(
  route: PreparedRoute,
  rider: Rider,
  type: ActivityType,
  timestamp: number,
  random: Random,
): { rider: Rider; location: LocationObject } {
  const moving = !rider.stopped && !isFinished(route, rider);
  const speed = moving ? cruisingSpeed(type, gradeAt(route, rider.distance), rider.elapsed) : 0;
  const distance = Math.min(route.total, rider.distance + speed);
  const position = positionAt(route, distance);

  const noise = {
    east: drift(rider.noise.east, 0.9, 0.8, random),
    north: drift(rider.noise.north, 0.9, 0.8, random),
    up: drift(rider.noise.up, 0.95, 0.6, random),
  };
  const latitude = position.latitude + noise.north / METERS_PER_DEGREE_LAT;
  const longitude =
    position.longitude + noise.east / (METERS_PER_DEGREE_LAT * Math.cos((position.latitude * Math.PI) / 180));

  return {
    rider: { distance, elapsed: rider.elapsed + 1, stopped: rider.stopped, noise },
    location: {
      timestamp,
      coords: {
        latitude,
        longitude,
        altitude: position.altitude != null ? position.altitude + noise.up : null,
        accuracy: 4 + random() * 4,
        altitudeAccuracy: 3 + random() * 3,
        // La velocidad del GPS es bastante precisa; parado marca casi cero, nunca cero exacto.
        speed: moving ? Math.max(0, speed + (random() - 0.5) * 0.3) : random() * 0.15,
        heading: moving ? position.heading : null,
      },
    },
  };
}

/** Generador pseudoaleatorio con semilla (mulberry32), para que los tests sean repetibles. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paseo aleatorio que tiende a volver a cero: `keep` es la inercia y `step`, el tamaño del paso. */
function drift(value: number, keep: number, step: number, random: Random): number {
  return value * keep + (random() - 0.5) * step;
}

function bearing(from: RoutePoint, to: RoutePoint): number {
  const toRad = Math.PI / 180;
  const dLon = (to.longitude - from.longitude) * toRad;
  const y = Math.sin(dLon) * Math.cos(to.latitude * toRad);
  const x =
    Math.cos(from.latitude * toRad) * Math.sin(to.latitude * toRad) -
    Math.sin(from.latitude * toRad) * Math.cos(to.latitude * toRad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
