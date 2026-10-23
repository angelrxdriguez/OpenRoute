import type { ActivityTypeConfig } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';
import { MAX_HORIZONTAL_ACCURACY } from '@/stats/clean-track';
import { haversineDistance } from '@/stats/geo';
import { stepSpeed } from '@/stats/timeline';

/** Parado durante este tiempo (ms), la grabación se pausa sola. */
export const AUTO_PAUSE_DELAY = 3000;

/** Lecturas seguidas en movimiento que hacen falta para reanudar: una sola puede ser ruido del GPS. */
export const AUTO_RESUME_READINGS = 2;

export type AutoPauseState = {
  paused: boolean;
  /** Desde cuándo (ms) estás parado sin que la grabación se haya pausado todavía. */
  stillSince: number | null;
  /** Última lectura fiable, guardada o no: sirve para calcular la velocidad de la siguiente. */
  last: TrackPoint | null;
  /** Hora de la última lectura recibida, para no procesar dos veces la misma. */
  seenUntil: number;
  /** En pausa: la última lectura parada. Se guarda al reanudar para que lo parado no cuente como movimiento. */
  lastStill: TrackPoint | null;
  /** En pausa: lecturas en movimiento a la espera de confirmar que de verdad has arrancado. */
  pending: TrackPoint[];
};

/** Estado al empezar o reanudar una grabación. `last` es el último punto guardado, si lo hay. */
export function initialAutoPause(last: TrackPoint | null = null): AutoPauseState {
  return { paused: false, stillSince: null, last, seenUntil: last?.timestamp ?? 0, lastStill: null, pending: [] };
}

/**
 * Decide qué lecturas del GPS se guardan. Si estás parado `AUTO_PAUSE_DELAY`, la grabación se
 * pausa y deja de guardar puntos; al volver a moverte se reanuda sola. Las estadísticas no
 * dependen de esto (ya descuentan las paradas), pero el mapa queda limpio y la pantalla de
 * grabación sabe que estás parado. Espera las lecturas ordenadas por tiempo.
 */
export function applyAutoPause(
  state: AutoPauseState,
  points: TrackPoint[],
  config: ActivityTypeConfig,
): { state: AutoPauseState; accepted: TrackPoint[] } {
  let { paused, stillSince, last, seenUntil, lastStill, pending } = state;
  const accepted: TrackPoint[] = [];

  for (const point of points) {
    if (point.timestamp <= seenUntil) continue;
    seenUntil = point.timestamp;

    // Una lectura imprecisa se guarda (son los datos en bruto) pero no decide si te mueves.
    const moving = isAccurate(point) ? isMoving(point, last, config) : null;
    if (moving != null) last = point;

    if (!paused) {
      accepted.push(point);
      if (moving === true) {
        stillSince = null;
      } else if (moving === false) {
        stillSince ??= point.timestamp;
        if (point.timestamp - stillSince >= AUTO_PAUSE_DELAY) {
          paused = true;
          lastStill = null;
          pending = [];
        }
      }
    } else if (moving === true) {
      pending = [...pending, point];
      if (pending.length >= AUTO_RESUME_READINGS) {
        if (lastStill) accepted.push(lastStill);
        accepted.push(...pending);
        paused = false;
        stillSince = null;
        lastStill = null;
        pending = [];
      }
    } else if (moving === false) {
      lastStill = point;
      pending = [];
    }
  }

  return { state: { paused, stillSince, last, seenUntil, lastStill, pending }, accepted };
}

function isAccurate(point: TrackPoint): boolean {
  return point.accuracy == null || (point.accuracy >= 0 && point.accuracy <= MAX_HORIZONTAL_ACCURACY);
}

function isMoving(point: TrackPoint, last: TrackPoint | null, config: ActivityTypeConfig): boolean {
  const seconds = last ? (point.timestamp - last.timestamp) / 1000 : 0;
  const meters = last ? haversineDistance(last, point) : 0;
  return stepSpeed(point, meters, seconds) >= config.movingThreshold;
}
