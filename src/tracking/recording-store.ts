import { create } from 'zustand';

import type { ActivityType } from '@/domain/activity-types';
import type { TrackPoint } from '@/domain/models';

export type RecordingSession = {
  activityId: number;
  type: ActivityType;
  status: 'recording' | 'paused';
  startedAt: number;
  segment: number;
  /** Puntos en bruto de la grabación en curso, ya guardados en la base de datos. */
  points: TrackPoint[];
};

type RecordingState = {
  session: RecordingSession | null;
  setSession: (session: RecordingSession | null) => void;
  setStatus: (status: RecordingSession['status'], segment: number) => void;
  appendPoints: (points: TrackPoint[]) => void;
};

export const useRecordingStore = create<RecordingState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  setStatus: (status, segment) =>
    set(({ session }) => (session ? { session: { ...session, status, segment } } : {})),
  appendPoints: (points) =>
    set(({ session }) => (session ? { session: { ...session, points: [...session.points, ...points] } } : {})),
}));
