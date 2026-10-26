import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon } from '@/components/activity-icon';
import { Button } from '@/components/button';
import { ConfirmSheet, type SheetAction } from '@/components/confirm-sheet';
import { RouteMap } from '@/components/route-map';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { ACTIVITY_TYPE_CONFIG, ACTIVITY_TYPES, type ActivityType, type IconName } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';
import { useActivityColor } from '@/hooks/use-activity-color';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { cleanTrack } from '@/stats/clean-track';
import { computeStats } from '@/stats/compute-stats';
import { formatDistance, formatDuration, formatElevation, formatPrimarySpeed } from '@/stats/format';
import { watchPreviewPosition } from '@/tracking/location-source';
import { LocationPermissionError, type GpsPreview } from '@/tracking/location-types';
import {
  discardRecording,
  finishRecording,
  pauseRecording,
  resumeRecording,
  startRecording,
} from '@/tracking/recorder';
import { useRecordingStore, type RecordingSession } from '@/tracking/recording-store';

/** Si la última posición es más antigua que esto, la velocidad actual se muestra como 0. */
const CURRENT_SPEED_MAX_AGE_MS = 5000;

const NO_POINTS: TrackPoint[] = [];

/** La última actividad elegida, para no tener que volver a elegirla cada vez. */
let lastSelectedType: ActivityType = 'road_bike';

export default function RecordScreen() {
  const session = useRecordingStore((state) => state.session);
  // Al guardar o descartar, la sesión desaparece un instante antes de salir de la pantalla:
  // así no asoma la de elegir actividad mientras tanto.
  const [leaving, setLeaving] = useState(false);

  if (session) return <RecordingView session={session} onLeave={() => setLeaving(true)} />;
  if (leaving) return <ThemedView style={styles.container} />;
  return <StartView />;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

function RoundButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.roundButton, { backgroundColor: theme.background }]}>
      <SymbolView name={icon} tintColor={theme.text} size={20} />
    </Pressable>
  );
}

function ErrorMessage({ error }: { error: unknown }) {
  const theme = useTheme();
  const message = error instanceof Error ? error.message : String(error);
  const canOpenSettings = error instanceof LocationPermissionError && Platform.OS !== 'web';

  return (
    <View style={[styles.error, { borderColor: theme.danger }]}>
      <ThemedText type="small">{message}</ThemedText>
      {canOpenSettings && (
        <Pressable accessibilityRole="link" onPress={() => Linking.openSettings()}>
          <ThemedText type="smallBold">Abrir Ajustes</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

function GpsStatus({ gps }: { gps: GpsPreview }) {
  const theme = useTheme();
  const { label, background, foreground } = {
    searching: { label: 'Buscando GPS…', background: theme.background, foreground: theme.text },
    // El amarillo solo de relleno y con texto negro, como pide la paleta.
    ready: { label: 'GPS listo', background: theme.accent, foreground: theme.onAccent },
    denied: { label: 'Sin permiso de ubicación', background: theme.danger, foreground: theme.onDanger },
  }[gps.status];

  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <ThemedText type="smallBold" style={{ color: foreground }}>
        {label}
      </ThemedText>
    </View>
  );
}

function TypeOption({ type, selected, onPress }: { type: ActivityType; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const color = useActivityColor(type);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.typeOption,
        {
          backgroundColor: selected ? `${color}22` : theme.backgroundElement,
          borderColor: selected ? color : 'transparent',
        },
      ]}>
      <ActivityIcon type={type} size={36} />
      <ThemedText type="smallBold" style={styles.typeLabel}>
        {ACTIVITY_TYPE_CONFIG[type].label}
      </ThemedText>
    </Pressable>
  );
}

function StartView() {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<ActivityType>(lastSelectedType);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [gps, setGps] = useState<GpsPreview>({ status: 'searching' });

  useEffect(() => watchPreviewPosition(setGps), []);

  const position = useMemo(
    () => (gps.status === 'ready' ? { latitude: gps.latitude, longitude: gps.longitude } : null),
    [gps],
  );

  const onStart = async () => {
    lastSelectedType = type;
    setStarting(true);
    setError(null);
    try {
      await startRecording(type);
    } catch (startError) {
      setError(startError);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapArea}>
        <RouteMap points={NO_POINTS} mode="follow" position={position} />
        <View style={[styles.topBar, { top: insets.top + Spacing.two }]}>
          <RoundButton icon={Icons.close} label="Cerrar" onPress={close} />
          <GpsStatus gps={gps} />
        </View>
      </View>

      <ThemedView style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <ThemedText type="smallBold">¿Qué vas a hacer?</ThemedText>
        <View style={styles.typeGrid}>
          {ACTIVITY_TYPES.map((id) => (
            <TypeOption key={id} type={id} selected={id === type} onPress={() => setType(id)} />
          ))}
        </View>
        {error != null && <ErrorMessage error={error} />}
        <Button title="Empezar" icon={Icons.play} loading={starting} onPress={onStart} />
      </ThemedView>
    </ThemedView>
  );
}

function RecordingView({ session, onLeave }: { session: RecordingSession; onLeave: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const config = ACTIVITY_TYPE_CONFIG[session.type];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sheet, setSheet] = useState<'finish' | 'discard' | null>(null);
  const current = useNow(1000);

  const track = useMemo(() => cleanTrack(session.points, config), [session.points, config]);
  const stats = useMemo(() => computeStats(session.points, session.type), [session.points, session.type]);

  const lastClean = track[track.length - 1];
  const position = useMemo(
    () => (lastClean ? { latitude: lastClean.latitude, longitude: lastClean.longitude } : null),
    [lastClean],
  );

  const lastRaw = session.points[session.points.length - 1];
  // El reloj se refresca cada segundo y las posiciones pueden llegar antes: el total nunca
  // debe quedarse por detrás del tiempo en movimiento.
  const elapsed = (Math.max(current, lastRaw?.timestamp ?? 0) - session.startedAt) / 1000;
  const gpsSpeed =
    session.status === 'recording' && lastRaw && current - lastRaw.timestamp < CURRENT_SPEED_MAX_AGE_MS
      ? Math.max(0, lastRaw.speed ?? 0)
      : 0;
  // Parado (por debajo del umbral de la actividad) se muestra 0 km/h o «–» de ritmo, no 116:00 min/km.
  const currentSpeed = gpsSpeed >= config.movingThreshold ? gpsSpeed : 0;
  const isPace = config.primaryMetric === 'pace';
  const recording = session.status === 'recording';

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (actionError) {
      setError(actionError);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    setSheet(null);
    run(async () => {
      onLeave();
      const id = await finishRecording();
      router.replace({ pathname: '/activity/[id]', params: { id: String(id) } });
    });
  };

  const discard = () => {
    setSheet(null);
    run(async () => {
      onLeave();
      await discardRecording();
      close();
    });
  };

  const sheets: Record<'finish' | 'discard', { title: string; message: string; actions: SheetAction[] }> = {
    finish: {
      title: '¿Terminar la actividad?',
      message: `${formatDistance(stats.distance).value} km · ${formatDuration(stats.movingTime)} en movimiento`,
      actions: [
        { title: 'Guardar', onPress: save },
        { title: 'Descartar', variant: 'danger', onPress: () => setSheet('discard') },
        { title: 'Seguir grabando', variant: 'secondary', onPress: () => setSheet(null) },
      ],
    },
    discard: {
      title: '¿Descartar la actividad?',
      message: 'Se borrará el recorrido y no se podrá recuperar.',
      actions: [
        { title: 'Descartar', variant: 'danger', onPress: discard },
        { title: 'Cancelar', variant: 'secondary', onPress: () => setSheet('finish') },
      ],
    },
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.mapArea}>
        <RouteMap points={track} mode="follow" position={position} />
        <View style={[styles.topBar, { top: insets.top + Spacing.two }]}>
          <RoundButton icon={Icons.minimize} label="Minimizar" onPress={close} />
          <View style={[styles.pill, styles.statusPill, { backgroundColor: theme.background }]}>
            <View style={[styles.statusDot, { backgroundColor: recording ? theme.danger : theme.warning }]} />
            <ThemedText type="smallBold">{recording ? 'Grabando' : 'En pausa'}</ThemedText>
          </View>
        </View>
      </View>

      <ThemedView style={[styles.panel, { paddingBottom: insets.bottom + Spacing.three }]}>
        <View style={styles.activityHeader}>
          <ActivityIcon type={session.type} size={28} />
          <ThemedText type="smallBold">{config.label}</ThemedText>
        </View>

        <View style={styles.hero}>
          <Stat label="Tiempo en movimiento" measure={formatDuration(stats.movingTime)} size="hero" style={styles.center} />
          <ThemedText type="small" themeColor="textSecondary">
            {`Total ${formatDuration(elapsed)}`}
          </ThemedText>
        </View>

        <View style={styles.statsGrid}>
          <Stat style={styles.gridItem} label="Distancia" measure={formatDistance(stats.distance)} size="large" />
          <Stat
            style={styles.gridItem}
            label={isPace ? 'Ritmo' : 'Velocidad'}
            measure={formatPrimarySpeed(session.type, currentSpeed)}
            size="large"
          />
          <Stat style={styles.gridItem} label="Desnivel +" measure={formatElevation(stats.elevationGain)} size="large" />
          <Stat
            style={styles.gridItem}
            label={isPace ? 'Ritmo medio' : 'Media'}
            measure={formatPrimarySpeed(session.type, stats.avgSpeed)}
            size="large"
          />
        </View>

        {error != null && <ErrorMessage error={error} />}

        <View style={styles.actions}>
          {recording ? (
            <Button
              style={styles.action}
              title="Pausa"
              icon={Icons.pause}
              variant="secondary"
              loading={busy}
              onPress={() => run(pauseRecording)}
            />
          ) : (
            <Button
              style={styles.action}
              title="Reanudar"
              icon={Icons.play}
              loading={busy}
              onPress={() => run(resumeRecording)}
            />
          )}
          <Button
            style={styles.action}
            title="Terminar"
            icon={Icons.stop}
            variant="danger"
            disabled={busy}
            onPress={() => setSheet('finish')}
          />
        </View>
      </ThemedView>

      <ConfirmSheet
        visible={sheet != null}
        title={sheet ? sheets[sheet].title : ''}
        message={sheet ? sheets[sheet].message : undefined}
        actions={sheet ? sheets[sheet].actions : []}
        onCancel={() => setSheet(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapArea: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  panel: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    marginTop: -Radius.large,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeOption: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: 2,
  },
  typeLabel: {
    flexShrink: 1,
  },
  error: {
    borderWidth: 1,
    borderRadius: Radius.small,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  center: {
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.three,
  },
  gridItem: {
    width: '50%',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
