import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { isMapboxConfigured, Mapbox } from '@/lib/mapbox';

/**
 * Pantalla provisional: solo comprueba que el stack funciona en el iPhone
 * (Expo Router, tema claro/oscuro y el mapa nativo de Mapbox).
 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.container, { paddingBottom: insets.bottom + Spacing.three }]}>
      <View style={styles.mapFrame}>
        {isMapboxConfigured ? (
          <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Outdoors} scaleBarEnabled={false}>
            <Mapbox.Camera defaultSettings={{ centerCoordinate: [-3.7038, 40.4168], zoomLevel: 5 }} />
          </Mapbox.MapView>
        ) : (
          <ThemedView type="backgroundElement" style={[styles.map, styles.placeholder]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              Falta el token de Mapbox (EXPO_PUBLIC_MAPBOX_TOKEN).
            </ThemedText>
          </ThemedView>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Stack listo. Aquí irán tus actividades.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  mapFrame: {
    flex: 1,
    borderRadius: Radius.large,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
