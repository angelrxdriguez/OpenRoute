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

export function RouteMap({ points, color, mode, position, style }: RouteMapProps) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const hasCenteredRef = useRef(false);
  // El mapa ya cargado. Se compara con `mapRef` para no tocar uno recién creado (al cambiar de
  // tema claro/oscuro o al recargar en caliente) antes de que haya terminado de cargar.
  const [loadedMap, setLoadedMap] = useState<maplibregl.Map | null>(null);

  const route = useMemo(() => routeShape(points), [points]);
  const endpoints = useMemo(
    () => endpointsShape(mode === 'overview' ? points : [], color, theme.routeCasing),
    [mode, points, color, theme.routeCasing],
  );
  const bounds = useMemo(() => (mode === 'overview' ? boundsOf(points) : null), [mode, points]);
  const marker = useMemo(() => positionShape(mode === 'follow' ? position : null), [mode, position]);

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
      map.addSource('route', { type: 'geojson', data: empty });
      map.addSource('endpoints', { type: 'geojson', data: empty });
      map.addSource('position', { type: 'geojson', data: empty });
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
    map.setPaintProperty('route-casing', 'line-color', theme.routeCasing);
    map.setPaintProperty('route-line', 'line-color', color);
    map.setPaintProperty('position-circle', 'circle-color', theme.tint);
    map.setPaintProperty('position-circle', 'circle-stroke-color', theme.routeCasing);
  }, [loadedMap, color, theme.routeCasing, theme.tint]);

  useEffect(() => {
    const map = loadedMap;
    if (!map || map !== mapRef.current) return;
    map.getSource<GeoJSONSource>('route')?.setData(route);
    map.getSource<GeoJSONSource>('endpoints')?.setData(endpoints);
    map.getSource<GeoJSONSource>('position')?.setData(marker);
  }, [loadedMap, route, endpoints, marker]);

  useEffect(() => {
    const map = loadedMap;
    if (!map || map !== mapRef.current) return;
    if (mode === 'overview' && bounds) {
      map.fitBounds([bounds.sw, bounds.ne], { padding: 40, duration: 0 });
    } else if (mode === 'follow' && position) {
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
