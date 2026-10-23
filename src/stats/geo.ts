/** Radio medio de la Tierra en metros (IUGG). */
const EARTH_RADIUS = 6_371_008.8;
const TO_RAD = Math.PI / 180;

export type LatLng = { latitude: number; longitude: number };

/** Distancia en metros sobre la superficie terrestre (fórmula del semiverseno). */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const dLat = (b.latitude - a.latitude) * TO_RAD;
  const dLon = (b.longitude - a.longitude) * TO_RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * TO_RAD) * Math.cos(b.latitude * TO_RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Bounds = { ne: [number, number]; sw: [number, number] };

/** Caja que envuelve los puntos, en formato [longitud, latitud] como espera Mapbox. */
export function boundsOf(points: LatLng[]): Bounds | null {
  if (points.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const { latitude, longitude } of points) {
    minLat = Math.min(minLat, latitude);
    maxLat = Math.max(maxLat, latitude);
    minLon = Math.min(minLon, longitude);
    maxLon = Math.max(maxLon, longitude);
  }
  return { ne: [maxLon, maxLat], sw: [minLon, minLat] };
}
