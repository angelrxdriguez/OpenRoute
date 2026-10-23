import { create } from 'zustand';

import type { ActivityType } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';

export type RecordingSession = {
  activityId: number;
  type: ActivityType;
  /** Pausa manual (botón «Pausa»). */
  status: 'recording' | 'paused';
  /** Grabando pero parado: la grabación se ha pausado sola y se reanudará al moverte. */
  autoPaused: boolean;
  startedAt: number;
  segment: number;
  /** Puntos en bruto de la grabación en curso, ya guardados en la base de datos. */
  points: TrackPoint[];
};

type RecordingState = {
  session: RecordingSession | null;
  setSession: (session: RecordingSession | null) => void;
  setStatus: (status: RecordingSession['status'], segment: number) => void;
  setAutoPaused: (autoPaused: boolean) => void;
  appendPoints: (points: TrackPoint[]) => void;
};

export const useRecordingStore = create<RecordingState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  setStatus: (status, segment) =>
    set(({ session }) => (session ? { session: { ...session, status, segment, autoPaused: false } } : {})),
  setAutoPaused: (autoPaused) =>
    set(({ session }) => (session && session.autoPaused !== autoPaused ? { session: { ...session, autoPaused } } : {})),
  appendPoints: (points) =>
    set(({ session }) => (session ? { session: { ...session, points: [...session.points, ...points] } } : {})),
}));
