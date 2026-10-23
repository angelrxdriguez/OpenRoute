import type { ActivityType } from './activity-types';

/** Punto GPS tal y como lo entrega iOS. Se guarda en bruto; el filtrado se hace al calcular. */
export type TrackPoint = {
  /** Tramo de grabación: se incrementa en cada reanudación tras una pausa manual. */
  segment: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  /** Radio de incertidumbre horizontal en metros. */
  accuracy: number | null;
  altitudeAccuracy: number | null;
  /** Velocidad instantánea en m/s medida por el GPS (efecto Doppler). Negativa o null si no hay dato. */
  speed: number | null;
  heading: number | null;
};

export type ActivityStatus = 'recording' | 'paused' | 'finished';

export type Split = {
  /** 1 para el primer kilómetro. */
  index: number;
  distance: number;
  movingTime: number;
  elevationDelta: number;
};

export type ActivityStats = {
  /** Metros. */
  distance: number;
  /** Segundos en movimiento (sin pausas ni paradas). */
  movingTime: number;
  /** Segundos desde el inicio hasta el final, incluidas pausas. */
  elapsedTime: number;
  /** m/s sobre el tiempo en movimiento. */
  avgSpeed: number;
  maxSpeed: number;
  elevationGain: number;
  elevationLoss: number;
  minAltitude: number | null;
  maxAltitude: number | null;
  splits: Split[];
};

export type Activity = {
  id: number;
  type: ActivityType;
  name: string | null;
  status: ActivityStatus;
  startedAt: number;
  endedAt: number | null;
  currentSegment: number;
  /** Resumen guardado al terminar; null mientras se graba. */
  stats: Omit<ActivityStats, 'splits'> | null;
};
