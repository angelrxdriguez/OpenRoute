import { getDatabase } from '@/db/database';
import { isActivityType, type ActivityType } from '@/domain/activity-types';
import type { Activity, ActivityStats, ActivityStatus, TrackPoint } from '@/domain/models';

type ActivityRow = {
  id: number;
  type: string;
  name: string | null;
  status: ActivityStatus;
  started_at: number;
  ended_at: number | null;
  current_segment: number;
  distance: number | null;
  moving_time: number | null;
  elapsed_time: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  elevation_gain: number | null;
  elevation_loss: number | null;
  min_altitude: number | null;
  max_altitude: number | null;
};

type TrackPointRow = {
  segment: number;
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitude_accuracy: number | null;
  speed: number | null;
  heading: number | null;
};

/** SQLite limita las variables por sentencia; con 10 columnas por punto, 90 puntos caben de sobra. */
const POINTS_PER_INSERT = 90;

function toActivity(row: ActivityRow): Activity {
  if (!isActivityType(row.type)) {
    throw new Error(`Tipo de actividad desconocido: ${row.type}`);
  }
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    currentSegment: row.current_segment,
    stats:
      row.distance == null
        ? null
        : {
            distance: row.distance,
            movingTime: row.moving_time ?? 0,
            elapsedTime: row.elapsed_time ?? 0,
            avgSpeed: row.avg_speed ?? 0,
            maxSpeed: row.max_speed ?? 0,
            elevationGain: row.elevation_gain ?? 0,
            elevationLoss: row.elevation_loss ?? 0,
            minAltitude: row.min_altitude,
            maxAltitude: row.max_altitude,
          },
  };
}

function toTrackPoint(row: TrackPointRow): TrackPoint {
  return {
    segment: row.segment,
    timestamp: row.timestamp,
    latitude: row.latitude,
    longitude: row.longitude,
    altitude: row.altitude,
    accuracy: row.accuracy,
    altitudeAccuracy: row.altitude_accuracy,
    speed: row.speed,
    heading: row.heading,
  };
}

export async function createActivity(type: ActivityType, startedAt: number): Promise<Activity> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO activities (type, status, started_at, current_segment) VALUES (?, ?, ?, 0)',
    type,
    'recording',
    startedAt,
  );
  const activity = await getActivity(result.lastInsertRowId);
  if (!activity) throw new Error('No se pudo crear la actividad');
  return activity;
}

export async function getActivity(id: number): Promise<Activity | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ActivityRow>('SELECT * FROM activities WHERE id = ?', id);
  return row ? toActivity(row) : null;
}

/** La actividad que se está grabando o está en pausa, si la hay. */
export async function getUnfinishedActivity(): Promise<Activity | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ActivityRow>(
    "SELECT * FROM activities WHERE status != 'finished' ORDER BY started_at DESC LIMIT 1",
  );
  return row ? toActivity(row) : null;
}

export async function listFinishedActivities(): Promise<Activity[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ActivityRow>(
    "SELECT * FROM activities WHERE status = 'finished' ORDER BY started_at DESC",
  );
  return rows.map(toActivity);
}

export async function updateActivityStatus(id: number, status: ActivityStatus, currentSegment: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE activities SET status = ?, current_segment = ? WHERE id = ?', status, currentSegment, id);
}

export async function finishActivity(
  id: number,
  endedAt: number,
  name: string,
  stats: Omit<ActivityStats, 'splits'>,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE activities SET
       status = 'finished', ended_at = ?, name = ?,
       distance = ?, moving_time = ?, elapsed_time = ?, avg_speed = ?, max_speed = ?,
       elevation_gain = ?, elevation_loss = ?, min_altitude = ?, max_altitude = ?
     WHERE id = ?`,
    endedAt,
    name,
    stats.distance,
    stats.movingTime,
    stats.elapsedTime,
    stats.avgSpeed,
    stats.maxSpeed,
    stats.elevationGain,
    stats.elevationLoss,
    stats.minAltitude,
    stats.maxAltitude,
    id,
  );
}

export async function deleteActivity(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM track_points WHERE activity_id = ?', id);
  await db.runAsync('DELETE FROM activities WHERE id = ?', id);
}

export async function insertTrackPoints(activityId: number, points: TrackPoint[]): Promise<void> {
  if (points.length === 0) return;
  const db = await getDatabase();

  for (let start = 0; start < points.length; start += POINTS_PER_INSERT) {
    const chunk = points.slice(start, start + POINTS_PER_INSERT);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = chunk.flatMap((p) => [
      activityId,
      p.segment,
      p.timestamp,
      p.latitude,
      p.longitude,
      p.altitude,
      p.accuracy,
      p.altitudeAccuracy,
      p.speed,
      p.heading,
    ]);
    await db.runAsync(
      `INSERT INTO track_points
         (activity_id, segment, timestamp, latitude, longitude, altitude, accuracy, altitude_accuracy, speed, heading)
       VALUES ${placeholders}`,
      params,
    );
  }
}

export async function getTrackPoints(activityId: number): Promise<TrackPoint[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TrackPointRow>(
    `SELECT segment, timestamp, latitude, longitude, altitude, accuracy, altitude_accuracy, speed, heading
     FROM track_points WHERE activity_id = ? ORDER BY timestamp`,
    activityId,
  );
  return rows.map(toTrackPoint);
}
