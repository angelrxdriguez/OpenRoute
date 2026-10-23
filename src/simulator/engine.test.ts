import type { TrackPoint } from '@/domain/models';
import { computeStats } from '@/stats/compute-stats';
import { haversineDistance } from '@/stats/geo';
import { METERS_PER_DEGREE_LAT, START } from '@/stats/test-utils';
import {
  createRider,
  cruisingSpeed,
  positionAt,
  prepareRoute,
  seededRandom,
  stepRider,
  type PreparedRoute,
  type Rider,
} from '@/simulator/engine';
import { BUILT_IN_ROUTES } from '@/simulator/routes';

/** Ruta recta hacia el norte de `meters` metros que sube `climb` metros. */
function straightRoute(meters: number, climb = 0): PreparedRoute {
  return prepareRoute([
    { latitude: 40, longitude: -3.7, altitude: 600 },
    { latitude: 40 + meters / METERS_PER_DEGREE_LAT, longitude: -3.7, altitude: 600 + climb },
  ]);
}

/** Simula `seconds` segundos y devuelve las lecturas como puntos de la app. */
function ride(route: PreparedRoute, seconds: number, type: 'road_bike' | 'run', rider: Rider = createRider()) {
  const random = seededRandom(42);
  const points: TrackPoint[] = [];
  let current = rider;
  for (let s = 0; s < seconds; s++) {
    const step = stepRider(route, current, type, START + s * 1000, random);
    current = step.rider;
    const { coords, timestamp } = step.location;
    points.push({ segment: 0, timestamp, ...coords });
  }
  return { points, rider: current };
}

describe('simulador de GPS', () => {
  it('mide la ruta e interpola posiciones y altitud', () => {
    const route = straightRoute(1000, 50);
    expect(route.total).toBeCloseTo(1000, 0);
    const middle = positionAt(route, 500);
    expect(middle.altitude).toBeCloseTo(625, 5);
    expect(middle.heading).toBeCloseTo(0, 5);
    expect(haversineDistance(route.points[0], middle)).toBeCloseTo(500, 0);
  });

  it('va más despacio cuesta arriba y más rápido cuesta abajo', () => {
    const flat = cruisingSpeed('road_bike', 0, 0);
    expect(cruisingSpeed('road_bike', 0.05, 0)).toBeLessThan(flat * 0.6);
    expect(cruisingSpeed('road_bike', -0.05, 0)).toBeGreaterThan(flat * 1.3);
    expect(cruisingSpeed('run', 0, 0)).toBeLessThan(flat / 2);
  });

  it('genera lecturas que la app convierte en estadísticas creíbles', () => {
    const { points } = ride(straightRoute(20_000), 600, 'road_bike');
    const stats = computeStats(points, 'road_bike');
    // Unos 27 km/h en llano durante 10 minutos: alrededor de 4,5 km.
    expect(stats.distance).toBeGreaterThan(4000);
    expect(stats.distance).toBeLessThan(5000);
    expect(stats.avgSpeed * 3.6).toBeGreaterThan(24);
    expect(stats.avgSpeed * 3.6).toBeLessThan(30);
    // El error del GPS no debe inventarse desnivel en llano.
    expect(stats.elevationGain).toBeLessThan(10);
  });

  it('se queda quieto si te paras y al llegar al final', () => {
    const route = straightRoute(100);
    const stopped = ride(route, 30, 'run', { ...createRider(10), stopped: true });
    expect(stopped.rider.distance).toBe(10);
    expect(computeStats(stopped.points, 'run').distance).toBe(0);

    const finished = ride(route, 120, 'run');
    expect(finished.rider.distance).toBeCloseTo(route.total, 5);
  });

  it('las rutas de ejemplo tienen recorrido y altitud', () => {
    for (const route of BUILT_IN_ROUTES) {
      const prepared = prepareRoute(route.points);
      expect(prepared.total).toBeGreaterThan(5000);
      expect(route.points.every((p) => p.altitude != null)).toBe(true);
    }
  });
});
