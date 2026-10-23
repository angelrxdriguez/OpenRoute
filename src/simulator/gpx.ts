import type { RoutePoint } from '@/simulator/engine';

/**
 * Lee los puntos de un GPX (los de Strava, Garmin, Komoot… sirven). Toma los puntos de
 * track (`trkpt`) y, si no hay, los de ruta (`rtept`). Los tiempos del archivo se ignoran:
 * el simulador decide la velocidad según la actividad que grabes.
 */
export function parseGpx(xml: string): RoutePoint[] {
  const trackPoints = readPoints(xml, 'trkpt');
  return trackPoints.length > 0 ? trackPoints : readPoints(xml, 'rtept');
}

/** Nombre del recorrido (`<name>` del primer track o del archivo), si lo tiene. */
export function gpxName(xml: string): string | null {
  const match = /<name>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/name>/i.exec(xml);
  const name = match?.[1].trim();
  return name ? decodeEntities(name) : null;
}

function readPoints(xml: string, tag: 'trkpt' | 'rtept'): RoutePoint[] {
  const points: RoutePoint[] = [];
  const pattern = new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'gi');

  for (const match of xml.matchAll(pattern)) {
    const attributes = match[1];
    const body = match[2] ?? '';
    const latitude = Number(/\blat\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1]);
    const longitude = Number(/\blon\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const elevation = /<ele>\s*([^<]+?)\s*<\/ele>/i.exec(body)?.[1];
    const altitude = elevation != null && Number.isFinite(Number(elevation)) ? Number(elevation) : null;
    points.push({ latitude, longitude, altitude });
  }

  return points;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
