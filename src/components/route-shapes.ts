import type { StyleProp, ViewStyle } from 'react-native';

import type { TrackPoint } from '@/domain/models';
import type { LatLng } from '@/stats/geo';

/** Lo que reciben las dos versiones del mapa (`route-map.tsx` en iOS y `route-map.web.tsx`). */
export type RouteMapProps = {
  /** Puntos ya filtrados con `cleanTrack`. */
  points: TrackPoint[];
  /** Color de la actividad. */
  color: string;
  /** `follow` sigue tu posición mientras grabas; `overview` encuadra la ruta completa. */
  mode: 'follow' | 'overview';
  /** En `follow`, tu posición actual: el mapa la marca y la sigue. */
  position?: LatLng | null;
  style?: StyleProp<ViewStyle>;
};

/** Madrid, para cuando todavía no hay posición. */
export const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];
export const DEFAULT_ZOOM = 5;
export const FOLLOW_ZOOM = 16;

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

/** Una línea por tramo, para no unir con una recta el sitio donde pausaste y donde reanudaste. */
export function routeShape(points: TrackPoint[]): GeoJSON.FeatureCollection {
  const lines: GeoJSON.Position[][] = [];
  let segment: number | null = null;
  for (const point of points) {
    if (point.segment !== segment) {
      lines.push([]);
      segment = point.segment;
    }
    lines[lines.length - 1].push([point.longitude, point.latitude]);
  }
  const drawable = lines.filter((line) => line.length >= 2);
  if (drawable.length === 0) return EMPTY;
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: drawable } }],
  };
}

/** Salida (hueca, con el borde del color de la actividad) y llegada (rellena). */
export function endpointsShape(points: TrackPoint[], color: string, casing: string): GeoJSON.FeatureCollection {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return EMPTY;
  const marker = (p: TrackPoint, fill: string, stroke: string): GeoJSON.Feature => ({
    type: 'Feature',
    properties: { fill, stroke },
    geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
  });
  return { type: 'FeatureCollection', features: [marker(first, casing, color), marker(last, color, casing)] };
}

export function positionShape(position: LatLng | null | undefined): GeoJSON.FeatureCollection {
  if (!position) return EMPTY;
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] } },
    ],
  };
}
