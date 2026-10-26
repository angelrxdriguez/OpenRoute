import {
  defaultActivityName,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatPrimarySpeed,
  formatRelativeDateTime,
  formatSpeed,
} from '@/stats/format';

describe('format', () => {
  it('formatea distancias en km con coma decimal', () => {
    expect(formatDistance(0)).toEqual({ value: '0,00', unit: 'km' });
    expect(formatDistance(12345)).toEqual({ value: '12,35', unit: 'km' });
    expect(formatDistance(123456)).toEqual({ value: '123,5', unit: 'km' });
  });

  it('formatea duraciones con y sin horas', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(309.9)).toBe('5:09');
    expect(formatDuration(3909)).toBe('1:05:09');
  });

  it('formatea velocidad y ritmo', () => {
    expect(formatSpeed(10)).toEqual({ value: '36,0', unit: 'km/h' });
    expect(formatPace(1000 / 330)).toEqual({ value: '5:30', unit: 'min/km' });
    expect(formatPace(0)).toEqual({ value: '–', unit: 'min/km' });
  });

  it('usa velocidad en todas las actividades, también a pie', () => {
    expect(formatPrimarySpeed('run', 1000 / 300)).toEqual({ value: '12,0', unit: 'km/h' });
    expect(formatPrimarySpeed('walk', 1.4)).toEqual({ value: '5,0', unit: 'km/h' });
    expect(formatPrimarySpeed('road_bike', 8).unit).toBe('km/h');
    expect(formatPrimarySpeed('mtb', 5).unit).toBe('km/h');
  });

  it('redondea el desnivel', () => {
    expect(formatElevation(152.6)).toEqual({ value: '153', unit: 'm' });
  });

  it('formatea fechas en español', () => {
    expect(formatDateTime(new Date(2026, 9, 22, 10, 5).getTime())).toBe('jueves, 22 oct · 10:05');
  });

  it('dice hoy y ayer en las listas', () => {
    const now = new Date(2026, 9, 23, 12, 0).getTime();
    expect(formatRelativeDateTime(new Date(2026, 9, 23, 0, 0).getTime(), now)).toBe('Hoy · 0:00');
    expect(formatRelativeDateTime(new Date(2026, 9, 22, 18, 5).getTime(), now)).toBe('Ayer · 18:05');
    expect(formatRelativeDateTime(new Date(2026, 9, 21, 23, 59).getTime(), now)).toBe('miércoles, 21 oct · 23:59');
  });

  it('pone nombre según el momento del día', () => {
    expect(defaultActivityName('run', new Date(2026, 9, 23, 7, 30).getTime())).toBe('Carrera de mañana');
    expect(defaultActivityName('mtb', new Date(2026, 9, 23, 17, 0).getTime())).toBe('Ruta en BTT de tarde');
    expect(defaultActivityName('walk', new Date(2026, 9, 23, 22, 0).getTime())).toBe('Caminata de noche');
  });
});
