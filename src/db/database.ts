import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'openroute.db';

/**
 * Cada entrada lleva la base de datos de la versión `índice` a `índice + 1`.
 * Nunca se edita una migración ya publicada: se añade otra al final.
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    current_segment INTEGER NOT NULL DEFAULT 0,
    distance REAL,
    moving_time REAL,
    elapsed_time REAL,
    avg_speed REAL,
    max_speed REAL,
    elevation_gain REAL,
    elevation_loss REAL,
    min_altitude REAL,
    max_altitude REAL
  );
  CREATE INDEX idx_activities_started_at ON activities (started_at DESC);
  CREATE INDEX idx_activities_status ON activities (status);

  CREATE TABLE track_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
    segment INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    altitude REAL,
    accuracy REAL,
    altitude_accuracy REAL,
    speed REAL,
    heading REAL
  );
  CREATE INDEX idx_track_points_activity ON track_points (activity_id, timestamp);
  `,
];

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Conexión única compartida por la interfaz y la tarea de GPS en segundo plano.
 * No usamos `SQLiteProvider` porque la tarea de GPS se ejecuta fuera de React.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openDatabase().catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

/**
 * En el navegador, al recargar, la página anterior tarda un momento en soltar el archivo de la
 * base de datos (y con dos pestañas abiertas no lo suelta nunca). Se reintenta un par de segundos.
 */
async function openWithRetry(): Promise<SQLite.SQLiteDatabase> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await SQLite.openDatabaseAsync(DATABASE_NAME);
    } catch (error) {
      if (process.env.EXPO_OS !== 'web' || attempt >= 10) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await openWithRetry();
  // En el navegador (entorno de pruebas) SQLite no admite el modo WAL.
  if (process.env.EXPO_OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await migrate(db);
  return db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    // `withTransactionAsync` y no la exclusiva, que no existe en el navegador. Las migraciones
    // corren al abrir la conexión, antes de que nadie más pueda escribir.
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
  }
}
