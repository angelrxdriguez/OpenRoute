import { ACTIVITY_TYPE_CONFIG, type ActivityType } from '@/domain/activity-types';

/** Un valor listo para pintar, separado de su unidad para poder darle otro estilo. */
export type Measure = { value: string; unit: string };

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', ',');
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDistance(meters: number): Measure {
  const km = meters / 1000;
  return { value: decimal(km, km >= 100 ? 1 : 2), unit: 'km' };
}

/** `1:05:09` con horas, `5:09` sin ellas. */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function formatSpeed(metersPerSecond: number): Measure {
  return { value: decimal(metersPerSecond * 3.6, 1), unit: 'km/h' };
}

/** Ritmo en minutos por kilómetro. Por debajo de 0,5 km/h no tiene sentido y se muestra un guion. */
export function formatPace(metersPerSecond: number): Measure {
  if (metersPerSecond < 0.14) return { value: '–', unit: '/km' };
  const secondsPerKm = Math.round(1000 / metersPerSecond);
  return { value: `${Math.floor(secondsPerKm / 60)}:${pad(secondsPerKm % 60)}`, unit: '/km' };
}

/** Velocidad o ritmo según lo que tenga sentido para el tipo de actividad. */
export function formatPrimarySpeed(type: ActivityType, metersPerSecond: number): Measure {
  return ACTIVITY_TYPE_CONFIG[type].primaryMetric === 'pace'
    ? formatPace(metersPerSecond)
    : formatSpeed(metersPerSecond);
}

export function formatElevation(meters: number): Measure {
  return { value: String(Math.round(meters)), unit: 'm' };
}

/** `jueves, 23 oct · 10:32` */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} · ${date.getHours()}:${pad(date.getMinutes())}`;
}

/** Para listas: `Hoy · 10:32`, `Ayer · 18:05` y, si es de antes, como `formatDateTime`. */
export function formatRelativeDateTime(timestamp: number, now: number): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const time = `${date.getHours()}:${pad(date.getMinutes())}`;

  if (timestamp >= today.getTime()) return `Hoy · ${time}`;
  if (timestamp >= yesterday.getTime()) return `Ayer · ${time}`;
  return formatDateTime(timestamp);
}

/** Título por defecto según la hora del día: «Carrera de mañana», «Ruta en bici de tarde»… */
export function defaultActivityName(type: ActivityType, startedAt: number): string {
  const hour = new Date(startedAt).getHours();
  const moment = hour < 6 ? 'de madrugada' : hour < 13 ? 'de mañana' : hour < 21 ? 'de tarde' : 'de noche';
  const noun: Record<ActivityType, string> = {
    road_bike: 'Ruta en bici',
    mtb: 'Ruta en BTT',
    run: 'Carrera',
    walk: 'Caminata',
  };
  return `${noun[type]} ${moment}`;
}
