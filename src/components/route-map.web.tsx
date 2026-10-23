import 'maplibre-gl/dist/maplibre-gl.css';

import maplibregl, { type GeoJSONSource } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  endpointsShape,
  FOLLOW_ZOOM,
  positionShape,
  routeShape,
  type RouteMapProps,
} from '@/components/route-shapes';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { boundsOf } from '@/stats/geo';

/**
 * Mapa del entorno de pruebas en el navegador: MapLibre con los mapas gratuitos de
 * OpenFreeMap (sin cuenta ni token). En el iPhone se usa `route-map.tsx`, con Mapbox.
 */
const MAP_STYLE = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;

export function RouteMap({ points, mode, position, trail, style }: RouteMapProps) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasCenteredRef = useRef(false);
  // El mapa ya cargado. Se compara con `mapRef` para no tocar uno recién creado (al cambiar de
  // tema claro/oscuro o al recargar en caliente) antes de que haya terminado de cargar.
  const [loadedMap, setLoadedMap] = useState<maplibregl.Map | null>(null);

  const replay = mode === 'replay';
  const line = useMemo(() => routeShape(replay ? (trail ?? []) : points), [replay, trail, points]);
  const muted = useMemo(() => routeShape(replay ? points : []), [replay, points]);
  const endpoints = useMemo(
    () => endpointsShape(mode === 'overview' ? points : [], theme.route, theme.routeCasing),
    [mode, points, theme.route, theme.routeCasing],
  );
  const bounds = useMemo(() => (mode === 'follow' ? null : boundsOf(points)), [mode, points]);
  const marker = useMemo(() => positionShape(position), [position]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE[scheme],
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    hasCenteredRef.current = false;

    map.on('load', () => {
      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
      map.addSource('route-muted', { type: 'geojson', data: empty });
      map.addSource('route', { type: 'geojson', data: empty });
      map.addSource('endpoints', { type: 'geojson', data: empty });
      map.addSource('position', { type: 'geojson', data: empty });
      map.addLayer({
        id: 'route-muted-line',
        type: 'line',
        source: 'route-muted',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': 4 },
      });
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': 8 },
      });
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-width': 5 },
      });
      map.addLayer({
        id: 'endpoints-circle',
        type: 'circle',
        source: 'endpoints',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'fill'],
          'circle-stroke-color': ['get', 'stroke'],
          'circle-stroke-width': 3,
        },
      });
      map.addLayer({
        id: 'position-circle',
        type: 'circle',
        source: 'position',
        paint: { 'circle-radius': 8, 'circle-stroke-width': 3 },
      });
      // Los créditos del mapa empiezan desplegados y tapan media pantalla: se dejan en su botón «i».
      container.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      setLoadedMap(map);
    });

    return () => {
      setLoadedMap(null);
      map.remove();
      mapRef.current = null;
    };
  }, [scheme]);

  useEffect(() => {
    const map = loadedMap;
    if (!map || map !== mapRef.current) return;
    map.setPaintProperty('route-muted-line', 'line-color', theme.routeMuted);
    map.setPaintProperty('route-casing', 'line-color', theme.routeCasing);
    map.setPaintProperty('route-line', 'line-color', theme.route);
    map.setPaintProperty('position-circle', 'circle-color', theme.tint);
    map.setPaintProperty('position-circle', 'circle-stroke-color', theme.markerRing);
  }, [loadedMap, theme.routeMuted, theme.routeCasing, theme.route, theme.tint, theme.markerRing]);

  // Una fuente por efecto: en la repetición solo cambian lo recorrido y el punto, y así no se
  // vuelve a mandar la ruta entera en cada fotograma.
  useEffect(() => {
    if (loadedMap && loadedMap === mapRef.current) loadedMap.getSource<GeoJSONSource>('route')?.setData(line);
  }, [loadedMap, line]);

  useEffect(() => {
    if (loadedMap && loadedMap === mapRef.current) loadedMap.getSource<GeoJSONSource>('route-muted')?.setData(muted);
  }, [loadedMap, muted]);

  useEffect(() => {
    if (loadedMap && loadedMap === mapRef.current) loadedMap.getSource<GeoJSONSource>('endpoints')?.setData(endpoints);
  }, [loadedMap, endpoints]);

  useEffect(() => {
    if (loadedMap && loadedMap === mapRef.current) loadedMap.getSource<GeoJSONSource>('position')?.setData(marker);
  }, [loadedMap, marker]);

  useEffect(() => {
    const map = loadedMap;
    if (!map || map !== mapRef.current || !bounds) return;
    map.fitBounds([bounds.sw, bounds.ne], { padding: 40, duration: 0 });
  }, [loadedMap, bounds]);

  useEffect(() => {
    const map = loadedMap;
    if (!map || map !== mapRef.current) return;
    if (mode === 'follow' && position) {
      const center: [number, number] = [position.longitude, position.latitude];
      if (hasCenteredRef.current) {
        // Solo se mueve: respeta el zoom que hayas puesto.
        map.easeTo({ center, duration: 600 });
      } else {
        // La primera vez salta directamente: una animación de zoom la cortaría la siguiente posición.
        hasCenteredRef.current = true;
        map.jumpTo({ center, zoom: FOLLOW_ZOOM });
      }
    }
  }, [loadedMap, mode, bounds, position]);

  return (
    <View style={[styles.map, { backgroundColor: theme.backgroundElement }, style]}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    overflow: 'hidden',
  },
});
