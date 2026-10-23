import { gpxName, parseGpx } from '@/simulator/gpx';

const STRAVA_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
 <metadata><time>2026-10-20T07:12:03Z</time></metadata>
 <trk>
  <name>Vuelta a la Casa de Campo &amp; Madrid Río</name>
  <type>cycling</type>
  <trkseg>
   <trkpt lat="40.4192000" lon="-3.7347000">
    <ele>612.4</ele>
    <time>2026-10-20T07:12:03Z</time>
   </trkpt>
   <trkpt lon="-3.7350000" lat="40.4195000"><ele>613.0</ele></trkpt>
   <trkpt lat='40.4198' lon='-3.7353'/>
  </trkseg>
 </trk>
</gpx>`;

describe('parseGpx', () => {
  it('lee los puntos de track con su altitud, en cualquier orden de atributos', () => {
    expect(parseGpx(STRAVA_GPX)).toEqual([
      { latitude: 40.4192, longitude: -3.7347, altitude: 612.4 },
      { latitude: 40.4195, longitude: -3.735, altitude: 613 },
      { latitude: 40.4198, longitude: -3.7353, altitude: null },
    ]);
  });

  it('usa los puntos de ruta si no hay track', () => {
    const gpx = '<gpx><rte><rtept lat="1" lon="2"/><rtept lat="3" lon="4"><ele>5</ele></rtept></rte></gpx>';
    expect(parseGpx(gpx)).toEqual([
      { latitude: 1, longitude: 2, altitude: null },
      { latitude: 3, longitude: 4, altitude: 5 },
    ]);
  });

  it('ignora puntos sin coordenadas válidas', () => {
    expect(parseGpx('<trkpt lat="abc" lon="1"></trkpt><trkpt lat="1" lon="1"></trkpt>')).toHaveLength(1);
  });

  it('saca el nombre del recorrido', () => {
    expect(gpxName(STRAVA_GPX)).toBe('Vuelta a la Casa de Campo & Madrid Río');
    expect(gpxName('<gpx><trk><trkseg/></trk></gpx>')).toBeNull();
  });
});
