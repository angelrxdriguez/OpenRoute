import { useRef, useState, type ChangeEvent } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/stats/format';
import { BUILT_IN_ROUTES, type SimulatedRoute } from '@/simulator/routes';
import {
  loadGpx,
  restartRoute,
  selectRoute,
  setSpeed,
  setStopped,
  SIMULATOR_SPEEDS,
  useSimulatorStore,
} from '@/simulator/simulator';
import { getOffset, resetOffset } from '@/simulator/virtual-clock';

/** Controles del simulador de GPS. Solo existe en el navegador (lo monta `dev-shell.web.tsx`). */
export function SimulatorPanel() {
  const theme = useTheme();
  const simulator = useSimulatorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  // Solo para refrescar el adelanto del reloj.
  useNow(1000);
  const clockOffset = getOffset();

  const routes: SimulatedRoute[] = simulator.customRoute
    ? [...BUILT_IN_ROUTES, simulator.customRoute]
    : BUILT_IN_ROUTES;
  const progress = simulator.totalDistance > 0 ? simulator.distance / simulator.totalDistance : 0;

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      loadGpx(file.name, await file.text());
      setGpxError(null);
    } catch (error) {
      setGpxError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.heading}>
          Simulador de GPS
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Hace de GPS del iPhone mientras grabas. Elige una ruta, abre «Grabar» y empieza.
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Ruta</ThemedText>
        {routes.map((route) => {
          const selected = route.id === simulator.route.id;
          return (
            <Pressable
              key={route.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: simulator.emitting }}
              disabled={simulator.emitting}
              onPress={() => selectRoute(route.id)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                  borderColor: selected ? theme.text : 'transparent',
                  opacity: simulator.emitting && !selected ? 0.4 : 1,
                },
              ]}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {route.name}
              </ThemedText>
              {selected && (
                <ThemedText type="small" themeColor="textSecondary">
                  {`${formatDistance(simulator.totalDistance).value} km`}
                </ThemedText>
              )}
            </Pressable>
          );
        })}
        <input ref={fileInputRef} type="file" accept=".gpx,application/gpx+xml" hidden onChange={onFile} />
        <Button
          title="Cargar un GPX…"
          variant="secondary"
          disabled={simulator.emitting}
          onPress={() => fileInputRef.current?.click()}
        />
        {gpxError && (
          <ThemedText type="small" style={{ color: theme.danger }}>
            {gpxError}
          </ThemedText>
        )}
      </View>

      <View style={styles.section}>
        <ThemedText type="smallBold">Velocidad del tiempo</ThemedText>
        <View style={[styles.segmented, { backgroundColor: theme.backgroundElement }]}>
          {SIMULATOR_SPEEDS.map((speed) => {
            const selected = speed === simulator.speed;
            return (
              <Pressable
                key={speed}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSpeed(speed)}
                style={[styles.segment, selected && { backgroundColor: theme.tint }]}>
                <ThemedText type="smallBold" style={{ color: selected ? theme.onTint : theme.text }}>
                  {`×${speed}`}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {`Un minuto real son ${simulator.speed} minutos para la app.`}
        </ThemedText>
      </View>

      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View
            style={[styles.dot, { backgroundColor: simulator.emitting ? theme.danger : theme.textSecondary }]}
          />
          <ThemedText type="smallBold">
            {simulator.emitting ? 'Emitiendo posiciones' : 'GPS apagado: se enciende al grabar'}
          </ThemedText>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.tint }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {simulator.finished
            ? 'Has llegado al final de la ruta.'
            : `${formatDistance(simulator.distance).value} de ${formatDistance(simulator.totalDistance).value} km`}
        </ThemedText>
        <View style={styles.row}>
          <Button
            style={styles.flex}
            title={simulator.stopped ? 'Seguir' : 'Pararse'}
            variant="secondary"
            disabled={simulator.finished}
            onPress={() => setStopped(!simulator.stopped)}
          />
          <Button style={styles.flex} title="Volver a la salida" variant="secondary" onPress={restartRoute} />
        </View>
      </View>

      {Math.abs(clockOffset) > 60_000 && (
        <View style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary">
            {`El reloj de la app va ${formatOffset(clockOffset)} por delante de la hora real por haber acelerado el tiempo.`}
          </ThemedText>
          {!simulator.emitting && <Button title="Volver a la hora real" variant="secondary" onPress={resetOffset} />}
        </View>
      )}
    </View>
  );
}

function formatOffset(ms: number): string {
  const minutes = Math.round(Math.abs(ms) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 === 0 ? `${hours} h` : `${hours} h ${minutes % 60} min`;
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 24,
    lineHeight: 30,
  },
  option: {
    borderRadius: Radius.medium,
    borderWidth: 2,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    padding: Spacing.one,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
