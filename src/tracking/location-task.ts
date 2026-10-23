/**
 * Tarea que recibe las posiciones del GPS, también con la pantalla bloqueada.
 * Debe definirse al cargar el módulo (no dentro de un componente), así que se importa
 * lo primero en `src/app/_layout.tsx`. En el navegador se usa `location-task.web.ts`.
 */
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { LOCATION_TASK } from '@/tracking/location-source';
import { handleLocationBatch } from '@/tracking/recorder';

TaskManager.defineTask<{ locations: LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn(`[OpenRoute] Error del GPS: ${error.message}`);
    return;
  }
  if (data?.locations?.length) {
    await handleLocationBatch(data.locations);
  }
});
