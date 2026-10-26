import { requireOptionalNativeModule } from 'expo';

import { now } from '@/lib/clock';
import { computeStats } from '@/stats/compute-stats';
import {
  liveActivityAttributes,
  liveActivityState,
  type LiveActivityAttributes,
  type LiveActivityState,
} from '@/tracking/live-activity-content';
import type { RecordingSession } from '@/tracking/recording-store';

/**
 * Live Activity de la grabación en curso: los datos en la pantalla bloqueada y en la Dynamic
 * Island. La pinta la extensión `targets/route-activity`; aquí solo se le mandan los datos, a
 * través del módulo nativo `modules/live-activity`. En el navegador se usa `live-activity.web.ts`.
 */
type NativeLiveActivity = {
  /** Sustituye la Live Activity que hubiera por una nueva. false si están desactivadas en Ajustes. */
  start(attributes: LiveActivityAttributes, state: LiveActivityState, staleDate: number): boolean;
  update(state: LiveActivityState, staleDate: number): void;
  end(): void;
};

/** null con un `.ipa` anterior a la Live Activity: entonces no se hace nada. */
const native = requireOptionalNativeModule<NativeLiveActivity>('OpenRouteLiveActivity');

/** Entre actualizaciones (ms). El cronómetro avanza solo; esto refresca distancia y ritmo. */
const UPDATE_INTERVAL = 5000;

/**
 * Sin actualizaciones durante este tiempo (ms), la app ha dejado de grabar (iOS la ha cerrado)
 * y la Live Activity lo indica en vez de seguir contando.
 */
const STALE_AFTER = 2 * 60 * 1000;

let lastUpdateAt = 0;
let lastMode: string | null = null;

/** Lo que obliga a actualizar al momento: pausar, reanudar, pararse o arrancar. */
function modeOf(session: RecordingSession): string {
  return `${session.status}:${session.autoPaused}`;
}

function send(session: RecordingSession, action: (state: LiveActivityState, staleDate: number) => void): void {
  const at = now();
  try {
    action(liveActivityState(session, computeStats(session.points, session.type)), at + STALE_AFTER);
    lastUpdateAt = at;
    lastMode = modeOf(session);
  } catch (error) {
    console.warn('[OpenRoute] No se pudo actualizar la Live Activity', error);
  }
}

/** Solo funciona con la app en primer plano: al empezar a grabar o al recuperar la grabación. */
export function startLiveActivity(session: RecordingSession): void {
  if (!native) return;
  send(session, (state, staleDate) => native.start(liveActivityAttributes(session.type), state, staleDate));
}

/** Se llama con cada lote del GPS; solo manda datos cada `UPDATE_INTERVAL` o si cambia el estado. */
export function updateLiveActivity(session: RecordingSession): void {
  if (!native) return;
  if (modeOf(session) === lastMode && now() - lastUpdateAt < UPDATE_INTERVAL) return;
  send(session, (state, staleDate) => native.update(state, staleDate));
}

export function endLiveActivity(): void {
  if (!native) return;
  lastMode = null;
  try {
    native.end();
  } catch (error) {
    console.warn('[OpenRoute] No se pudo cerrar la Live Activity', error);
  }
}
