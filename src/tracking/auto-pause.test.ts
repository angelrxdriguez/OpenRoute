import { ACTIVITY_TYPE_CONFIG } from '@/domain/activity-types';
import { computeStats } from '@/stats/compute-stats';
import { buildTrack } from '@/stats/test-utils';
import { applyAutoPause, AUTO_PAUSE_DELAY, initialAutoPause } from '@/tracking/auto-pause';

const run = ACTIVITY_TYPE_CONFIG.run;

describe('applyAutoPause', () => {
  it('guarda todo mientras te mueves', () => {
    const track = buildTrack([{ seconds: 60, speed: 3 }]);
    const { state, accepted } = applyAutoPause(initialAutoPause(), track, run);

    expect(state.paused).toBe(false);
    expect(accepted).toHaveLength(track.length);
  });

  it('se pausa tras unos segundos parado y deja de guardar puntos', () => {
    const track = buildTrack([
      { seconds: 30, speed: 3 },
      { seconds: 60, speed: 0 },
    ]);
    const { state, accepted } = applyAutoPause(initialAutoPause(), track, run);

    expect(state.paused).toBe(true);
    // Los 31 puntos en movimiento y los parados desde el primero hasta el que cumple el retardo.
    expect(accepted).toHaveLength(31 + AUTO_PAUSE_DELAY / 1000 + 1);
  });

  it('no se pausa por una parada más corta que el retardo', () => {
    const track = buildTrack([
      { seconds: 30, speed: 3 },
      { seconds: 2, speed: 0 },
      { seconds: 30, speed: 3 },
    ]);
    const { state, accepted } = applyAutoPause(initialAutoPause(), track, run);

    expect(state.paused).toBe(false);
    expect(accepted).toHaveLength(track.length);
  });

  it('se reanuda al volver a moverte y la parada no cuenta como movimiento', () => {
    const track = buildTrack([
      { seconds: 100, speed: 3 },
      { seconds: 120, speed: 0 },
      { seconds: 100, speed: 3 },
    ]);
    const { state, accepted } = applyAutoPause(initialAutoPause(), track, run);
    const stats = computeStats(accepted, 'run');

    expect(state.paused).toBe(false);
    expect(accepted.length).toBeLessThan(track.length);
    expect(stats.movingTime).toBe(200);
    expect(stats.distance).toBeCloseTo(600, 0);
    // El tiempo total sigue contando la parada.
    expect(stats.elapsedTime).toBe(320);
  });

  it('no se reanuda por una sola lectura con ruido', () => {
    const track = buildTrack([
      { seconds: 30, speed: 3 },
      { seconds: 30, speed: 0 },
    ]);
    track[45] = { ...track[45], speed: 1.5 };
    const { state } = applyAutoPause(initialAutoPause(), track, run);

    expect(state.paused).toBe(true);
  });

  it('da lo mismo recibir las lecturas de una en una que por lotes', () => {
    const track = buildTrack([
      { seconds: 50, speed: 3 },
      { seconds: 40, speed: 0 },
      { seconds: 50, speed: 3 },
    ]);
    const batch = applyAutoPause(initialAutoPause(), track, run).accepted;

    let state = initialAutoPause();
    const oneByOne = track.flatMap((point) => {
      const result = applyAutoPause(state, [point], run);
      state = result.state;
      return result.accepted;
    });

    expect(oneByOne).toEqual(batch);
  });

  it('ignora las lecturas repetidas', () => {
    const track = buildTrack([{ seconds: 10, speed: 3 }]);
    const first = applyAutoPause(initialAutoPause(), track, run);
    const again = applyAutoPause(first.state, track, run);

    expect(again.accepted).toHaveLength(0);
  });
});
