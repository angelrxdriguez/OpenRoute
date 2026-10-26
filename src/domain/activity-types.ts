import type { SymbolViewProps } from 'expo-symbols';

/** Icono para cada plataforma: SF Symbol en iOS y Material Symbol en el navegador. */
export type IconName = Exclude<SymbolViewProps['name'], string>;

export const ACTIVITY_TYPES = ['road_bike', 'mtb', 'run', 'walk'] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** El color de cada actividad depende del tema: está en `ActivityColors` y se lee con `useActivityColor`. */
export type ActivityTypeConfig = {
  id: ActivityType;
  label: string;
  icon: IconName;
  /**
   * Velocidad (km/h) o ritmo (min/km). El usuario prefiere km/h también a pie, así que todas van
   * en velocidad; el ritmo queda disponible por si alguna actividad lo necesita.
   */
  primaryMetric: 'speed' | 'pace';
  /** Velocidad (m/s) por debajo de la cual se considera que estás parado. */
  movingThreshold: number;
  /** Velocidad (m/s) por encima de la cual un punto se considera un salto del GPS. */
  maxPlausibleSpeed: number;
};

export const ACTIVITY_TYPE_CONFIG: Record<ActivityType, ActivityTypeConfig> = {
  road_bike: {
    id: 'road_bike',
    label: 'Bici de carretera',
    icon: { ios: 'bicycle', web: 'directions_bike' },
    primaryMetric: 'speed',
    movingThreshold: 1.0,
    maxPlausibleSpeed: 28,
  },
  mtb: {
    id: 'mtb',
    label: 'Bici de montaña',
    icon: { ios: 'figure.outdoor.cycle', web: 'pedal_bike' },
    primaryMetric: 'speed',
    movingThreshold: 0.8,
    maxPlausibleSpeed: 22,
  },
  run: {
    id: 'run',
    label: 'Correr',
    icon: { ios: 'figure.run', web: 'directions_run' },
    primaryMetric: 'speed',
    movingThreshold: 0.8,
    maxPlausibleSpeed: 10,
  },
  walk: {
    id: 'walk',
    label: 'Caminar',
    icon: { ios: 'figure.walk', web: 'directions_walk' },
    primaryMetric: 'speed',
    movingThreshold: 0.4,
    maxPlausibleSpeed: 5,
  },
};

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === 'string' && (ACTIVITY_TYPES as readonly string[]).includes(value);
}
