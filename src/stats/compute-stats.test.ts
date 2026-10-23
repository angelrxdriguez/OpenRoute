import type { TrackPoint } from '@/domain/models';
import { computeStats } from '@/stats/compute-stats';
import { boundsOf, haversineDistance } from '@/stats/geo';
import { buildTrack, METERS_PER_DEGREE_LAT, START } from '@/stats/test-utils';

describe('haversineDistance', () => {
  it('mide un grado de latitud', () => {
    const d = haversineDistance({ latitude: 40, longitude: -3 }, { latitude: 41, longitude: -3 });
    expect(d).toBeCloseTo(METERS_PER_DEGREE_LAT, 0);
  });

  it('mide Madrid–Barcelona en línea recta (~505 km)', () => {
    const d = haversineDistance(
      { latitude: 40.4168, longitude: -3.7038 },
      { latitude: 41.3874, longitude: 2.1686 },
    );
    expect(d / 1000).toBeCloseTo(505, -1);
  });
});

describe('boundsOf', () => {
  it('devuelve null sin puntos y la caja [lon, lat] con puntos', () => {
    expect(boundsOf([])).toBeNull();
    expect(
      boundsOf([
        { latitude: 40, longitude: -4 },
        { latitude: 41, longitude: -3 },
      ]),
    ).toEqual({ ne: [-3, 41], sw: [-4, 40] });
  });
});

describe('computeStats', () => {
  it('calcula distancia, tiempo y velocidad a ritmo constante', () => {
    const stats = computeStats(buildTrack([{ seconds: 600, speed: 8 }]), 'road_bike');

    expect(stats.distance).toBeCloseTo(4800, 0);
    expect(stats.movingTime).toBe(600);
    expect(stats.elapsedTime).toBe(600);
    expect(stats.avgSpeed).toBeCloseTo(8, 3);
    expect(stats.maxSpeed).toBeCloseTo(8, 3);
  });

  it('no cuenta distancia ni tiempo mientras estás parado', () => {
    const track = buildTrack([
      { seconds: 100, speed: 3 },
      { seconds: 60, speed: 0 },
      { seconds: 100, speed: 3 },
    ]);
    const stats = computeStats(track, 'run');

    expect(stats.distance).toBeCloseTo(600, 0);
    expect(stats.movingTime).toBe(200);
    expect(stats.elapsedTime).toBe(260);
  });

  it('ignora el temblor del GPS estando parado', () => {
    const still = buildTrack([{ seconds: 120, speed: 0 }]).map((p, i) => ({
      ...p,
      latitude: p.latitude + (i % 2 === 0 ? 0.00002 : -0.00002),
    }));
    const stats = computeStats(still, 'walk');

    expect(stats.distance).toBe(0);
    expect(stats.movingTime).toBe(0);
  });

  it('usa la velocidad derivada de las posiciones cuando falta la del GPS', () => {
    const track = buildTrack([{ seconds: 100, speed: 5 }]).map((p) => ({ ...p, speed: null }));
    const stats = computeStats(track, 'mtb');

    expect(stats.distance).toBeCloseTo(500, 0);
    expect(stats.movingTime).toBe(100);
  });

  it('no une los tramos separados por una pausa manual', () => {
    const track = buildTrack([
      { seconds: 300, speed: 5, segment: 0 },
      { seconds: 300, speed: 5, segment: 1, gapBefore: 600 },
    ]);
    const stats = computeStats(track, 'road_bike', {
      startedAt: START,
      endedAt: track[track.length - 1].timestamp,
    });

    // El primer paso de cada tramo nuevo no cuenta: no sabemos qué pasó durante la pausa.
    expect(stats.movingTime).toBe(599);
    expect(stats.distance).toBeCloseTo(2995, 0);
    expect(stats.elapsedTime).toBe(1200);
  });

  it('descarta un salto aislado del GPS', () => {
    const track = buildTrack([{ seconds: 200, speed: 3 }]);
    track[100] = { ...track[100], latitude: track[100].latitude + 0.005 };
    const stats = computeStats(track, 'run');

    expect(stats.distance).toBeCloseTo(600, 0);
  });

  it('descarta los puntos imprecisos', () => {
    const track = buildTrack([{ seconds: 200, speed: 3 }]).map((p, i) =>
      i >= 50 && i < 60 ? { ...p, accuracy: 80, latitude: p.latitude + 0.001 } : p,
    );
    const stats = computeStats(track, 'run');

    expect(stats.distance).toBeCloseTo(600, 0);
  });

  it('acepta el nuevo sitio si el GPS insiste tras varios saltos', () => {
    const track = buildTrack([{ seconds: 200, speed: 3 }]).map((p, i) =>
      i >= 100 ? { ...p, latitude: p.latitude + 0.01 } : p,
    );
    const stats = computeStats(track, 'run');

    // Se pierden los puntos rechazados, pero el resto de la ruta se sigue contando.
    expect(stats.distance).toBeGreaterThan(1500);
  });

  it('no suma desnivel por el ruido de la altitud en llano', () => {
    const track = buildTrack([{ seconds: 1800, speed: 3, altitudeNoise: 2 }]);
    const stats = computeStats(track, 'run');

    expect(stats.elevationGain).toBeLessThan(5);
    expect(stats.elevationLoss).toBeLessThan(5);
  });

  it('mide subida y bajada aunque la altitud tenga ruido', () => {
    const track = buildTrack([
      { seconds: 1200, speed: 4, climb: 150, altitudeNoise: 2 },
      { seconds: 600, speed: 10, climb: -150, altitudeNoise: 2 },
    ]);
    const stats = computeStats(track, 'mtb');

    expect(stats.elevationGain).toBeGreaterThan(140);
    expect(stats.elevationGain).toBeLessThan(160);
    expect(stats.elevationLoss).toBeGreaterThan(140);
    expect(stats.elevationLoss).toBeLessThan(160);
    expect(stats.maxAltitude! - stats.minAltitude!).toBeCloseTo(150, -1);
  });

  it('ignora las altitudes con mucha incertidumbre vertical', () => {
    const track = buildTrack([{ seconds: 300, speed: 3 }]).map((p, i) =>
      i % 10 === 0 ? { ...p, altitude: (p.altitude ?? 0) + 40, altitudeAccuracy: 50 } : p,
    );
    const stats = computeStats(track, 'run');

    expect(stats.elevationGain).toBe(0);
  });

  it('parte la actividad en kilómetros con su tiempo', () => {
    const stats = computeStats(buildTrack([{ seconds: 500, speed: 5 }]), 'run');

    expect(stats.splits.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(stats.splits[0].distance).toBe(1000);
    expect(stats.splits[0].movingTime).toBeCloseTo(200, 0);
    expect(stats.splits[1].movingTime).toBeCloseTo(200, 0);
    expect(stats.splits[2].distance).toBeCloseTo(500, 0);
    expect(stats.splits[2].movingTime).toBeCloseTo(100, 0);
  });

  it('refleja la subida de cada kilómetro', () => {
    const stats = computeStats(buildTrack([{ seconds: 400, speed: 5, climb: 80 }]), 'run');

    expect(stats.splits).toHaveLength(2);
    expect(stats.splits[0].elevationDelta).toBeCloseTo(40, -1);
    expect(stats.splits[1].elevationDelta).toBeCloseTo(40, -1);
  });

  it('devuelve ceros sin puntos', () => {
    const empty: TrackPoint[] = [];
    expect(computeStats(empty, 'walk')).toEqual({
      distance: 0,
      movingTime: 0,
      elapsedTime: 0,
      avgSpeed: 0,
      maxSpeed: 0,
      elevationGain: 0,
      elevationLoss: 0,
      minAltitude: null,
      maxAltitude: null,
      splits: [],
    });
  });
});
