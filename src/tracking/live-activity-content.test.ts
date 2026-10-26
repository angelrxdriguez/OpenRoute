import { computeStats } from '@/stats/compute-stats';
import { buildTrack, START } from '@/stats/test-utils';
import { liveActivityAttributes, liveActivityState } from '@/tracking/live-activity-content';
import type { RecordingSession } from '@/tracking/recording-store';

function session(overrides: Partial<RecordingSession>): RecordingSession {
  return {
    activityId: 1,
    type: 'walk',
    status: 'recording',
    autoPaused: false,
    startedAt: START,
    segment: 0,
    points: [],
    ...overrides,
  };
}

describe('liveActivityAttributes', () => {
  it('lleva el nombre, el icono y la métrica de la actividad', () => {
    expect(liveActivityAttributes('walk')).toMatchObject({
      activityName: 'Caminar',
      symbol: 'figure.walk',
      speedLabel: 'Velocidad media',
    });
  });

  it('usa colores de la paleta en #RRGGBB, que es lo que entiende la extensión', () => {
    const { activityName, symbol, speedLabel, ...colors } = liveActivityAttributes('run');
    for (const color of Object.values(colors)) expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe('liveActivityState', () => {
  // 2 minutos andando a 5 km/h: unos 167 m.
  const points = buildTrack([{ seconds: 120, speed: 5 / 3.6 }]);
  const stats = computeStats(points, 'walk');
  const last = points[points.length - 1].timestamp;

  it('formatea distancia, tiempo y velocidad media', () => {
    expect(liveActivityState(session({ points }), stats)).toMatchObject({
      paused: false,
      movingTime: '2:00',
      distance: '0,17',
      distanceUnit: 'km',
      speed: '5,0',
      speedUnit: 'km/h',
    });
  });

  it('ancla el cronómetro al último punto menos el tiempo en movimiento', () => {
    expect(liveActivityState(session({ points }), stats).timerStart).toBe(last - 120_000);
  });

  it('para el cronómetro en pausa, parado o sin puntos', () => {
    expect(liveActivityState(session({ points, status: 'paused' }), stats)).toMatchObject({
      paused: true,
      timerStart: null,
    });
    expect(liveActivityState(session({ points, autoPaused: true }), stats).timerStart).toBeNull();
    expect(liveActivityState(session({}), computeStats([], 'walk')).timerStart).toBeNull();
  });
});
