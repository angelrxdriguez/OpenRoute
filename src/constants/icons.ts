import type { IconName } from '@/domain/activity-types';

/** Iconos de la interfaz: SF Symbol en iOS y Material Symbol en el navegador. */
export const Icons = {
  record: { ios: 'record.circle', web: 'radio_button_checked' },
  play: { ios: 'play.fill', web: 'play_arrow' },
  pause: { ios: 'pause.fill', web: 'pause' },
  stop: { ios: 'stop.fill', web: 'stop' },
  close: { ios: 'xmark', web: 'close' },
  minimize: { ios: 'chevron.down', web: 'expand_more' },
  chevronRight: { ios: 'chevron.right', web: 'chevron_right' },
  trash: { ios: 'trash', web: 'delete' },
  location: { ios: 'location.fill', web: 'my_location' },
} satisfies Record<string, IconName>;
