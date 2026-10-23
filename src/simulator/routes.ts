import type { ActivityType } from '@/domain/activity-types';
import type { RoutePoint } from '@/simulator/engine';
import { CASA_DE_CAMPO } from '@/simulator/routes/casa-de-campo';
import { RETIRO } from '@/simulator/routes/retiro';

export type SimulatedRoute = {
  id: string;
  name: string;
  /** Actividad para la que está pensada; con otra también funciona. */
  suggestedType: ActivityType | null;
  points: RoutePoint[];
};

function fromTuples(tuples: [number, number, number][]): RoutePoint[] {
  return tuples.map(([latitude, longitude, altitude]) => ({ latitude, longitude, altitude }));
}

/** Rutas de ejemplo que trae el simulador. También se puede cargar cualquier GPX. */
export const BUILT_IN_ROUTES: SimulatedRoute[] = [
  {
    id: 'casa-de-campo',
    name: 'Casa de Campo en bici',
    suggestedType: 'road_bike',
    points: fromTuples(CASA_DE_CAMPO),
  },
  {
    id: 'retiro',
    name: 'Vuelta al Retiro corriendo',
    suggestedType: 'run',
    points: fromTuples(RETIRO),
  },
];
