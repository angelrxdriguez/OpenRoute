import { useMemo } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { isMapboxConfigured, Mapbox } from '@/lib/mapbox';
import { boundsOf } from '@/stats/geo';

/** Mapa de Mapbox (iPhone). En el navegador se usa `route-map.web.tsx`, con MapLibre. */
export function RouteMap({ points, mode, position, trail, style }: RouteMapProps) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const replay = mode === 'replay';
  const line = useMemo(() => routeShape(replay ? (trail ?? []) : points), [replay, trail, points]);
  const muted = useMemo(() => routeShape(replay ? points : []), [replay, points]);
  const endpoints = useMemo(
    () => endpointsShape(mode === 'overview' ? points : [], theme.route, theme.routeCasing),
    [mode, points, theme.route, theme.routeCasing],
  );
  const bounds = useMemo(() => (mode === 'follow' ? null : boundsOf(points)), [mode, points]);
  const marker = useMemo(() => positionShape(position), [position]);

  if (!isMapboxConfigured) {
    return (
      <View style={[styles.map, styles.placeholder, { backgroundColor: theme.backgroundElement }, style]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.placeholderText}>
          Mapa desactivado: falta el token de Mapbox (EXPO_PUBLIC_MAPBOX_TOKEN).
        </ThemedText>
      </View>
    );
  }

  return (
    <Mapbox.MapView
      style={[styles.map, style]}
      styleURL={dark ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Outdoors}
      scaleBarEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}>
      {mode === 'follow' ? (
        <Mapbox.Camera
          centerCoordinate={position ? [position.longitude, position.latitude] : DEFAULT_CENTER}
          zoomLevel={position ? FOLLOW_ZOOM : DEFAULT_ZOOM}
          animationMode="easeTo"
          animationDuration={800}
        />
      ) : (
        bounds && (
          <Mapbox.Camera
            bounds={bounds}
            padding={{ paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32 }}
            animationDuration={0}
          />
        )
      )}

      <Mapbox.ShapeSource id="route-muted" shape={muted}>
        <Mapbox.LineLayer
          id="route-muted-line"
          style={{ lineColor: theme.routeMuted, lineWidth: 4, lineCap: 'round', lineJoin: 'round' }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.ShapeSource id="route" shape={line}>
        <Mapbox.LineLayer
          id="route-casing"
          aboveLayerID="route-muted-line"
          style={{ lineColor: theme.routeCasing, lineWidth: 8, lineCap: 'round', lineJoin: 'round' }}
        />
        <Mapbox.LineLayer
          id="route-line"
          aboveLayerID="route-casing"
          style={{ lineColor: theme.route, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.ShapeSource id="endpoints" shape={endpoints}>
        <Mapbox.CircleLayer
          id="endpoints-circle"
          aboveLayerID="route-line"
          style={{
            circleRadius: 7,
            circleColor: ['get', 'fill'],
            circleStrokeColor: ['get', 'stroke'],
            circleStrokeWidth: 3,
          }}
        />
      </Mapbox.ShapeSource>

      <Mapbox.ShapeSource id="position" shape={marker}>
        <Mapbox.CircleLayer
          id="position-circle"
          aboveLayerID="endpoints-circle"
          style={{
            circleRadius: 8,
            circleColor: theme.tint,
            circleStrokeColor: theme.markerRing,
            circleStrokeWidth: 3,
          }}
        />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderText: {
    textAlign: 'center',
  },
});
