import { ActivityColors, Colors } from '@/constants/theme';
import { ACTIVITY_TYPE_CONFIG, type ActivityType } from '@/domain/activity-types';
import type { ActivityStats } from '@/domain/models';
import { formatDistance, formatDuration, formatPrimarySpeed } from '@/stats/format';
import type { RecordingSession } from '@/tracking/recording-store';

/**
 * Lo que no cambia mientras dura la grabación. Los campos tienen que coincidir con
 * `RouteActivityAttributesRecord` en `modules/live-activity/ios/LiveActivityModule.swift`.
 */
export type LiveActivityAttributes = {
  activityName: string;
  /** SF Symbol de la actividad. */
  symbol: string;
  speedLabel: string;
  // La Live Activity no puede leer `theme.ts`: los colores le llegan desde aquí.
  background: string;
  text: string;
  textSecondary: string;
  accent: string;
  activity: string;
  recording: string;
  paused: string;
};

/** Lo que se actualiza durante la grabación, ya formateado. Coincide con `RouteActivityStateRecord` en Swift. */
export type LiveActivityState = {
  /** Pausa manual. */
  paused: boolean;
  /** Tiempo en movimiento, para mostrarlo quieto cuando el cronómetro está parado. */
  movingTime: string;
  /**
   * Hora (ms) desde la que el cronómetro cuenta el tiempo en movimiento. iOS lo hace avanzar solo
   * entre una actualización y otra. null cuando no corre: en pausa o parado.
   */
  timerStart: number | null;
  distance: string;
  distanceUnit: string;
  speed: string;
  speedUnit: string;
};

export function liveActivityAttributes(type: ActivityType): LiveActivityAttributes {
  const config = ACTIVITY_TYPE_CONFIG[type];
  // La Live Activity va siempre sobre fondo negro, así que usa los colores del tema oscuro.
  const colors = Colors.dark;
  return {
    activityName: config.label,
    symbol: config.icon.ios ?? 'location.fill',
    speedLabel: config.primaryMetric === 'pace' ? 'Ritmo medio' : 'Velocidad media',
    background: colors.background,
    text: colors.text,
    textSecondary: colors.textSecondary,
    accent: colors.accent,
    activity: ActivityColors.dark[type],
    recording: colors.danger,
    paused: colors.warning,
  };
}

export function liveActivityState(session: RecordingSession, stats: ActivityStats): LiveActivityState {
  const lastTimestamp = session.points[session.points.length - 1]?.timestamp;
  const running = session.status === 'recording' && !session.autoPaused && lastTimestamp != null;
  const distance = formatDistance(stats.distance);
  const speed = formatPrimarySpeed(session.type, stats.avgSpeed);
  return {
    paused: session.status === 'paused',
    movingTime: formatDuration(stats.movingTime),
    // El tiempo en movimiento llega hasta el último punto, no hasta ahora: se ancla a ese punto.
    timerStart: running ? lastTimestamp - stats.movingTime * 1000 : null,
    distance: distance.value,
    distanceUnit: distance.unit,
    speed: speed.value,
    speedUnit: speed.unit,
  };
}
