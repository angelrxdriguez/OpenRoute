import type { LocationObject } from 'expo-location';
import { create } from 'zustand';

import type { ActivityType } from '@/domain/activity-types';
import {
  createRider,
  isFinished,
  positionAt,
  prepareRoute,
  seededRandom,
  stepRider,
  type PreparedRoute,
  type Rider,
  type RoutePosition,
} from '@/simulator/engine';
import { gpxName, parseGpx } from '@/simulator/gpx';
import { BUILT_IN_ROUTES, type SimulatedRoute } from '@/simulator/routes';
import { readJson, writeJson } from '@/simulator/storage';
import * as clock from '@/simulator/virtual-clock';
import { useRecordingStore } from '@/tracking/recording-store';

/**
 * Simulador de GPS para probar la app en el navegador. Hace de GPS del iPhone: mientras la
 * app tiene la localización encendida, emite una lectura por segundo (de reloj simulado)
 * recorriendo la ruta elegida. Solo se usa en web.
 */

export const SIMULATOR_SPEEDS = [1, 5, 20, 60] as const;
export type SimulatorSpeed = (typeof SIMULATOR_SPEEDS)[number];

export const CUSTOM_ROUTE_ID = 'custom';

export type SimulatorState = {
  route: SimulatedRoute;
  /** Último GPX cargado, si hay. */
  customRoute: SimulatedRoute | null;
  totalDistance: number;
  /** Metros recorridos sobre la ruta. */
  distance: number;
  /** Posición exacta sobre la ruta, sin el error del GPS. */
  position: RoutePosition;
  speed: SimulatorSpeed;
  stopped: boolean;
  finished: boolean;
  /** La app tiene la localización encendida (está grabando). */
  emitting: boolean;
};

type LocationListener = (locations: LocationObject[]) => void;

type SavedProgress = { routeId: string; speed: SimulatorSpeed; distance: number };

const PROGRESS_KEY = 'openroute.simulator';
const CUSTOM_ROUTE_KEY = 'openroute.simulator.route';
const TICK_MS = 250;
const SAVE_EVERY_MS = 2000;
/** Lecturas máximas por tick. Si la pestaña estuvo dormida más rato, se salta ese hueco. */
const MAX_BATCH = 3600;

const saved = readJson<SavedProgress>(PROGRESS_KEY);
const savedCustomRoute = readJson<SimulatedRoute>(CUSTOM_ROUTE_KEY);

let prepared: PreparedRoute;
let rider: Rider;
let random = seededRandom(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;
let nextReadingAt = 0;
let lastSaveAt = 0;
const listeners = new Set<LocationListener>();

function findRoute(id: string, customRoute: SimulatedRoute | null): SimulatedRoute {
  if (id === CUSTOM_ROUTE_ID && customRoute) return customRoute;
  return BUILT_IN_ROUTES.find((route) => route.id === id) ?? BUILT_IN_ROUTES[0];
}

function initialState(): SimulatorState {
  const route = findRoute(saved?.routeId ?? '', savedCustomRoute);
  prepared = prepareRoute(route.points);
  const distance = Math.min(saved?.distance ?? 0, prepared.total);
  rider = createRider(distance);
  return {
    route,
    customRoute: savedCustomRoute,
    totalDistance: prepared.total,
    distance,
    position: positionAt(prepared, distance),
    speed: saved?.speed && SIMULATOR_SPEEDS.includes(saved.speed) ? saved.speed : 20,
    stopped: false,
    finished: isFinished(prepared, rider),
    emitting: false,
  };
}

export const useSimulatorStore = create<SimulatorState>(initialState);

const state = () => useSimulatorStore.getState();

function saveProgress(): void {
  const { route, speed, distance } = state();
  writeJson(PROGRESS_KEY, { routeId: route.id, speed, distance } satisfies SavedProgress);
  clock.saveOffset();
  lastSaveAt = Date.now();
}

function syncRider(): void {
  useSimulatorStore.setState({
    distance: rider.distance,
    position: positionAt(prepared, rider.distance),
    stopped: rider.stopped,
    finished: isFinished(prepared, rider),
  });
}

function activityType(route: SimulatedRoute): ActivityType {
  return useRecordingStore.getState().session?.type ?? route.suggestedType ?? 'road_bike';
}

function tick(): void {
  const until = clock.now();
  const type = activityType(state().route);
  const batch: LocationObject[] = [];

  while (nextReadingAt <= until && batch.length < MAX_BATCH) {
    const step = stepRider(prepared, rider, type, nextReadingAt, random);
    rider = step.rider;
    batch.push(step.location);
    nextReadingAt += 1000;
  }
  if (nextReadingAt <= until) nextReadingAt = until + 1000;
  if (batch.length === 0) return;

  syncRider();
  if (Date.now() - lastSaveAt > SAVE_EVERY_MS) saveProgress();
  for (const listener of listeners) listener(batch);
}

/** Lo llama la app al encender la localización. */
export function startEmitting(): void {
  if (timer) return;
  clock.setRate(state().speed);
  nextReadingAt = clock.now();
  timer = setInterval(tick, TICK_MS);
  useSimulatorStore.setState({ emitting: true });
  tick();
}

/** Lo llama la app al apagar la localización. */
export function stopEmitting(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  clock.setRate(1);
  useSimulatorStore.setState({ emitting: false });
  saveProgress();
}

/** Recibe las lecturas del GPS simulado. Devuelve la función para dejar de recibirlas. */
export function subscribeLocations(listener: LocationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyRoute(route: SimulatedRoute): void {
  prepared = prepareRoute(route.points);
  rider = createRider();
  useSimulatorStore.setState({ route, totalDistance: prepared.total });
  syncRider();
  saveProgress();
}

export function selectRoute(id: string): void {
  applyRoute(findRoute(id, state().customRoute));
}

/** Carga un GPX y lo deja elegido. Lanza un error con el motivo si no se puede usar. */
export function loadGpx(fileName: string, xml: string): void {
  const points = parseGpx(xml);
  if (prepareRoute(points).total < 50) {
    throw new Error('El archivo no tiene un recorrido: hacen falta puntos de track (trkpt) o de ruta (rtept).');
  }
  const customRoute: SimulatedRoute = {
    id: CUSTOM_ROUTE_ID,
    name: gpxName(xml) ?? fileName.replace(/\.gpx$/i, ''),
    suggestedType: null,
    points,
  };
  writeJson(CUSTOM_ROUTE_KEY, customRoute);
  useSimulatorStore.setState({ customRoute });
  applyRoute(customRoute);
}

export function setSpeed(speed: SimulatorSpeed): void {
  useSimulatorStore.setState({ speed });
  if (timer) clock.setRate(speed);
  saveProgress();
}

/** Pararse o seguir, como en un semáforo. El GPS sigue emitiendo. */
export function setStopped(stopped: boolean): void {
  rider = { ...rider, stopped };
  syncRider();
}

export function restartRoute(): void {
  rider = createRider();
  random = seededRandom(Date.now());
  syncRider();
  saveProgress();
}
