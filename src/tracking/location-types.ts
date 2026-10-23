/** Lo que se sabe del GPS antes de empezar a grabar, para enseñarlo en el mapa. */
export type GpsPreview =
  | { status: 'searching' }
  | { status: 'denied' }
  | { status: 'ready'; latitude: number; longitude: number; accuracy: number | null };

export class LocationPermissionError extends Error {
  constructor() {
    super('OpenRoute necesita acceso a tu ubicación para grabar la ruta. Actívalo en Ajustes > OpenRoute > Ubicación.');
  }
}
