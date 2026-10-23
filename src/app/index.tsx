import { router, useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon } from '@/components/activity-icon';
import { Button } from '@/components/button';
import { Stat } from '@/components/stat';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Icons } from '@/constants/icons';
import { Radius, Spacing } from '@/constants/theme';
import { listFinishedActivities } from '@/db/activities';
import { ACTIVITY_TYPE_CONFIG } from '@/domain/activity-types';
import type { Activity } from '@/domain/models';
import { useTheme } from '@/hooks/use-theme';
import { now } from '@/lib/clock';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPrimarySpeed,
  formatRelativeDateTime,
} from '@/stats/format';
import { useRecordingStore } from '@/tracking/recording-store';

function startOfWeek(timestamp: number): number {
  const monday = new Date(timestamp);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday.getTime();
}

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const session = useRecordingStore((state) => state.session);
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loadedAt, setLoadedAt] = useState(now);

  useFocusEffect(
    useCallback(() => {
      listFinishedActivities()
        .then((list) => {
          setActivities(list);
          setLoadedAt(now());
        })
        .catch((error: unknown) => console.warn('[OpenRoute] No se pudieron cargar las actividades', error));
    }, []),
  );

  const week = useMemo(() => {
    const since = startOfWeek(loadedAt);
    const thisWeek = (activities ?? []).filter((a) => a.startedAt >= since);
    return {
      count: thisWeek.length,
      distance: thisWeek.reduce((sum, a) => sum + (a.stats?.distance ?? 0), 0),
      movingTime: thisWeek.reduce((sum, a) => sum + (a.stats?.movingTime ?? 0), 0),
      elevationGain: thisWeek.reduce((sum, a) => sum + (a.stats?.elevationGain ?? 0), 0),
    };
  }, [activities, loadedAt]);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={activities ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 104 }]}
        ListHeaderComponent={
          <ThemedView type="backgroundElement" style={styles.weekCard}>
            <ThemedText type="smallBold">Esta semana</ThemedText>
            <View style={styles.weekStats}>
              <Stat label="Distancia" measure={formatDistance(week.distance)} size="small" />
              <Stat label="Tiempo" measure={formatDuration(week.movingTime)} size="small" />
              <Stat label="Desnivel" measure={formatElevation(week.elevationGain)} size="small" />
              <Stat label="Actividades" measure={String(week.count)} size="small" />
            </View>
          </ThemedView>
        }
        ListEmptyComponent={
          activities ? (
            <View style={styles.empty}>
              <ThemedText type="smallBold">Aún no hay actividades</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Pulsa «Grabar» y sal a rodar, correr o caminar.
              </ThemedText>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => <ActivityRow activity={item} now={loadedAt} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
        {session ? (
          <Button
            title={session.status === 'paused' ? 'En pausa · Volver' : 'Grabando · Volver'}
            icon={Icons.location}
            variant="danger"
            onPress={() => router.push('/record')}
          />
        ) : (
          <Button title="Grabar" icon={Icons.record} onPress={() => router.push('/record')} />
        )}
      </View>
    </ThemedView>
  );
}

function ActivityRow({ activity, now }: { activity: Activity; now: number }) {
  const theme = useTheme();
  const config = ACTIVITY_TYPE_CONFIG[activity.type];
  const stats = activity.stats;

  let summary: string | null = null;
  if (stats) {
    // A pie importa el ritmo; en bici, el desnivel.
    const pace = formatPrimarySpeed(activity.type, stats.avgSpeed);
    const extra =
      config.primaryMetric === 'pace'
        ? `${pace.value} ${pace.unit}`
        : `↑ ${formatElevation(stats.elevationGain).value} m`;
    summary = `${formatDistance(stats.distance).value} km · ${formatDuration(stats.movingTime)} · ${extra}`;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/activity/[id]', params: { id: String(activity.id) } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <ActivityIcon type={activity.type} />
      <View style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {activity.name ?? config.label}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {`${config.label} · ${formatRelativeDateTime(activity.startedAt, now)}`}
        </ThemedText>
        {summary && <ThemedText type="small">{summary}</ThemedText>}
      </View>
      <SymbolView name={Icons.chevronRight} tintColor={theme.textSecondary} size={16} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  weekCard: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  weekStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.two,
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
  },
});
