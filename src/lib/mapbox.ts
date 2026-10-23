import Mapbox from '@rnmapbox/maps';

/** Token público (`pk.…`). En local va en `.env.local`; en GitHub Actions, en el secreto `MAPBOX_PUBLIC_TOKEN`. */
const accessToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

export const isMapboxConfigured = Boolean(accessToken);

if (accessToken) {
  Mapbox.setAccessToken(accessToken);
  // Privacidad: no enviar estadísticas de uso del mapa a Mapbox.
  Mapbox.setTelemetryEnabled(false);
}

export { Mapbox };
