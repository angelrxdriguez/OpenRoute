import { ActivityColors } from '@/constants/theme';
import type { ActivityType } from '@/domain/activity-types';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Color de la actividad en el tema actual. Va siempre con su icono y su nombre. */
export function useActivityColor(type: ActivityType): string {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return ActivityColors[scheme][type];
}
