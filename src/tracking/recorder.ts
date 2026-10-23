import type { LocationObject } from 'expo-location';

import {
  createActivity,
  deleteActivity,
  finishActivity,
  getTrackPoints,
  getUnfinishedActivity,
  insertTrackPoints,
  updateActivityStatus,
} from '@/db/activities';
import { ACTIVITY_TYPE_CONFIG, type ActivityType } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';
import { now } from '@/lib/clock';
import { computeStats } from '@/stats/compute-stats';
import { defaultActivityName } from '@/stats/format';
import { applyAutoPause, initialAutoPause } from '@/tracking/auto-pause';
import { ensurePermissions, startLocationUpdates, stopLocationUpdates } from '@/tracking/location-source';
import { useRecordingStore, type RecordingSession } from '@/tracking/recording-store';

const store = () => useRecordingStore.getState();

/** Los lotes de posiciones se guardan de uno en uno para no mezclar escrituras. */
let pendingWrites: Promise<void> = Promise.resolve();
let hydration: Promise<void> | null = null;
/** Estado de la pausa automática de la grabación en curso. */
let autoPause = initialAutoPause();

function requireSession(): RecordingSession {
  const session = store().session;
  if (!session) throw new Error('No hay ninguna grabación en curso');
  return session;
}

/** Carga en memoria la grabación a medias que haya en la base de datos, si la hay. */
function hydrateSession(): Promise<void> {
  hydration ??= (async () => {
    if (store().session) return;
    const activity = await getUnfinishedActivity();
    if (!activity) return;
    const points = await getTrackPoints(activity.id);
    if (store().session) return;
    autoPause = initialAutoPause(points[points.length - 1] ?? null);
    store().setSession({
      activityId: activity.id,
      type: activity.type,
      status: activity.status === 'paused' ? 'paused' : 'recording',
      autoPaused: false,
      startedAt: activity.startedAt,
      segment: activity.currentSegment,
      points,
    });
  })().finally(() => {
    hydration = null;
  });
  return hydration;
}

export async function startRecording(type: ActivityType): Promise<void> {
  await ensurePermissions();
  if (await getUnfinishedActivity()) throw new Error('Ya hay una actividad en curso');

  const activity = await createActivity(type, now());
  autoPause = initialAutoPause();
  store().setSession({
    activityId: activity.id,
    type,
    status: 'recording',
    autoPaused: false,
    startedAt: activity.startedAt,
    segment: 0,
    points: [],
  });

  try {
    await startLocationUpdates();
  } catch (error) {
    await deleteActivity(activity.id);
    store().setSession(null);
    throw error;
  }
}

/** El GPS sigue encendido en pausa para no perder la señal; las posiciones se ignoran. */
export async function pauseRecording(): Promise<void> {
  const session = requireSession();
  store().setStatus('paused', session.segment);
  await updateActivityStatus(session.activityId, 'paused', session.segment);
}

export async function resumeRecording(): Promise<void> {
  const session = requireSession();
  // Cada reanudación abre un tramo nuevo para no unir con una recta el sitio de la pausa y el actual.
  const segment = session.segment + 1;
  await updateActivityStatus(session.activityId, 'recording', segment);
  autoPause = initialAutoPause();
  store().setStatus('recording', segment);
  await startLocationUpdates();
}

/** Termina la grabación, calcula y guarda el resumen. Devuelve el id de la actividad. */
export async function finishRecording(): Promise<number> {
  const session = requireSession();
  store().setStatus('paused', session.segment);
  await stopLocationUpdates();
  await pendingWrites;

  const endedAt = now();
  const points = await getTrackPoints(session.activityId);
  const stats = computeStats(points, session.type, { startedAt: session.startedAt, endedAt });
  await finishActivity(session.activityId, endedAt, defaultActivityName(session.type, session.startedAt), stats);

  store().setSession(null);
  return session.activityId;
}

export async function discardRecording(): Promise<void> {
  const session = requireSession();
  store().setStatus('paused', session.segment);
  await stopLocationUpdates();
  await pendingWrites;
  await deleteActivity(session.activityId);
  store().setSession(null);
}

/**
 * Al abrir la app: si iOS la cerró a mitad de una grabación, recupera los puntos guardados
 * y vuelve a encender el GPS.
 */
export async function restoreRecording(): Promise<void> {
  await hydrateSession();
  if (store().session) await startLocationUpdates();
}

function toTrackPoint(location: LocationObject, segment: number): TrackPoint {
  const { coords } = location;
  return {
    segment,
    timestamp: location.timestamp,
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    accuracy: coords.accuracy,
    altitudeAccuracy: coords.altitudeAccuracy,
    speed: coords.speed,
    heading: coords.heading,
  };
}

async function persistLocations(locations: LocationObject[]): Promise<void> {
  if (!store().session) await hydrateSession();
  const session = store().session;
  if (!session || session.status !== 'recording') return;

  const incoming = locations
    .map((location) => toTrackPoint(location, session.segment))
    .sort((a, b) => a.timestamp - b.timestamp);
  const result = applyAutoPause(autoPause, incoming, ACTIVITY_TYPE_CONFIG[session.type]);
  autoPause = result.state;

  const lastTimestamp = session.points[session.points.length - 1]?.timestamp ?? 0;
  const points = result.accepted.filter((point) => point.timestamp > lastTimestamp);
  if (points.length > 0) {
    await insertTrackPoints(session.activityId, points);
    store().appendPoints(points);
  }
  store().setAutoPaused(result.state.paused);
}

/** Punto de entrada de las posiciones del GPS (la tarea en segundo plano o el simulador). */
export function handleLocationBatch(locations: LocationObject[]): Promise<void> {
  pendingWrites = pendingWrites
    .then(() => persistLocations(locations))
    .catch((error: unknown) => {
      console.warn('[OpenRoute] No se pudieron guardar las posiciones', error);
    });
  return pendingWrites;
}
