import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon } from '@/components/activity-icon';
import { Button } from '@/components/button';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { RouteMap } from '@/components/route-map';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { deleteActivity, getActivity, getTrackPoints } from '@/db/activities';
import { ACTIVITY_TYPE_CONFIG } from '@/domain/activity-types';
import type { Activity, Split, TrackPoint } from '@/domain/models';
import { useActivityColor } from '@/hooks/use-activity-color';
import { cleanTrack } from '@/stats/clean-track';
import { computeStats } from '@/stats/compute-stats';
import {
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPrimarySpeed,
} from '@/stats/format';

type Loaded = { activity: Activity; points: TrackPoint[] };

export default function ActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<Loaded | null | 'missing'>(null);

  useEffect(() => {
    const activityId = Number(id);
    Promise.all([getActivity(activityId), getTrackPoints(activityId)])
      .then(([activity, points]) => setData(activity ? { activity, points } : 'missing'))
      .catch((error: unknown) => {
        console.warn('[OpenRoute] No se pudo cargar la actividad', error);
        setData('missing');
      });
  }, [id]);

  if (data === null) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (data === 'missing') {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText>Esta actividad ya no existe.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.four }}>
        <ActivityDetail activity={data.activity} points={data.points} />
      </ScrollView>
    </ThemedView>
  );
}

function ActivityDetail({ activity, points }: Loaded) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];
  const color = useActivityColor(activity.type);
  const isPace = config.primaryMetric === 'pace';
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Se recalcula a partir de los puntos en bruto: si mejoramos los cálculos, se aplican también a lo antiguo.
  const track = useMemo(() => cleanTrack(points, config), [points, config]);
  const stats = useMemo(
    () => computeStats(points, activity.type, { startedAt: activity.startedAt, endedAt: activity.endedAt }),
    [points, activity],
  );

  const onDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteActivity(activity.id);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      console.warn('[OpenRoute] No se pudo borrar la actividad', error);
    }
  };

  return (
    <View>
      <Stack.Screen options={{ title: activity.name ?? config.label }} />
      <View style={styles.map}>
        <RouteMap points={track} mode="overview" />
      </View>

      <View style={styles.body}>
        <View style={styles.header}>
          <ActivityIcon type={activity.type} />
          <View style={styles.headerText}>
            <ThemedText type="smallBold">{config.label}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDateTime(activity.startedAt)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Stat style={styles.gridItem} label="Distancia" measure={formatDistance(stats.distance)} />
          <Stat style={styles.gridItem} label="Tiempo en movimiento" measure={formatDuration(stats.movingTime)} />
          <Stat
            style={styles.gridItem}
            label={isPace ? 'Ritmo medio' : 'Velocidad media'}
            measure={formatPrimarySpeed(activity.type, stats.avgSpeed)}
          />
          <Stat
            style={styles.gridItem}
            label={isPace ? 'Mejor ritmo' : 'Velocidad máxima'}
            measure={formatPrimarySpeed(activity.type, stats.maxSpeed)}
          />
          <Stat style={styles.gridItem} label="Desnivel +" measure={formatElevation(stats.elevationGain)} />
          <Stat style={styles.gridItem} label="Desnivel −" measure={formatElevation(stats.elevationLoss)} />
          <Stat style={styles.gridItem} label="Tiempo total" measure={formatDuration(stats.elapsedTime)} />
          <Stat
            style={styles.gridItem}
            label="Altitud máxima"
            measure={stats.maxAltitude != null ? formatElevation(stats.maxAltitude) : '–'}
          />
        </View>

        {stats.splits.length > 0 && <Splits splits={stats.splits} activity={activity} color={color} />}

        <Button title="Borrar actividad" icon={Icons.trash} variant="secondary" onPress={() => setConfirmDelete(true)} />
      </View>

      <ConfirmSheet
        visible={confirmDelete}
        title="¿Borrar la actividad?"
        message="Se borrará el recorrido y no se podrá recuperar."
        actions={[
          { title: 'Borrar', variant: 'danger', onPress: onDelete },
          { title: 'Cancelar', variant: 'secondary', onPress: () => setConfirmDelete(false) },
        ]}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function Splits({ splits, activity, color }: { splits: Split[]; activity: Activity; color: string }) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type];
  const speeds = splits.map((s) => (s.movingTime > 0 ? s.distance / s.movingTime : 0));
  const fastest = Math.max(...speeds, 0.001);

  return (
    <ThemedView type="backgroundElement" style={styles.splits}>
      <View style={styles.splitRow}>
        <ThemedText type="smallBold" style={styles.splitKm}>
          Km
        </ThemedText>
        <ThemedText type="smallBold" style={styles.splitSpeed}>
          {config.primaryMetric === 'pace' ? 'Ritmo' : 'Velocidad'}
        </ThemedText>
        <View style={styles.splitBarTrack} />
        <ThemedText type="smallBold" style={styles.splitElevation}>
          Desn.
        </ThemedText>
      </View>
      {splits.map((split, i) => {
        const measure = formatPrimarySpeed(activity.type, speeds[i]);
        const km = split.distance < 1000 ? formatDistance(split.distance).value : String(split.index);
        return (
          <View key={split.index} style={styles.splitRow}>
            <ThemedText type="small" style={styles.splitKm}>
              {km}
            </ThemedText>
            <ThemedText type="small" style={styles.splitSpeed}>
              {`${measure.value} ${measure.unit}`}
            </ThemedText>
            <View style={styles.splitBarTrack}>
              <View
                style={[styles.splitBar, { width: `${(speeds[i] / fastest) * 100}%`, backgroundColor: color }]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.splitElevation}>
              {`${split.elevationDelta >= 0 ? '+' : '−'}${formatElevation(Math.abs(split.elevationDelta)).value}`}
            </ThemedText>
          </View>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    height: 320,
  },
  body: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  headerText: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.four,
  },
  gridItem: {
    width: '50%',
  },
  splits: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  splitKm: {
    width: 40,
  },
  splitSpeed: {
    width: 92,
    fontVariant: ['tabular-nums'],
  },
  splitBarTrack: {
    flex: 1,
    height: 10,
  },
  splitBar: {
    height: 10,
    borderRadius: 5,
  },
  splitElevation: {
    width: 48,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
