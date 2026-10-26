import type { RecordingSession } from '@/tracking/recording-store';

/** En el navegador no hay pantalla bloqueada ni Dynamic Island: la Live Activity no hace nada. */

export function startLiveActivity(_session: RecordingSession): void {}

export function updateLiveActivity(_session: RecordingSession): void {}

export function endLiveActivity(): void {}
