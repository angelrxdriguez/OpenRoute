# Probar la app en Chrome

La app se puede usar en el navegador del PC, dentro de un marco del tamaño de un iPhone y con un **simulador de GPS** al lado. Sirve para ver y probar las pantallas sin el iPhone, sin cable y sin cuenta de Mapbox.

Decisión y alcance: [ADR-0003](adr/0003-entorno-de-pruebas-en-navegador.md).

## Arrancar

```bash
npm run web
```

Abre <http://localhost:8081> en Chrome. Si el puerto está ocupado: `npx expo start --web --port 8082`.

- **Tema claro u oscuro:** la app sigue el de Windows. Para forzar uno, añade `?tema=claro` o `?tema=oscuro` a la URL.
- **Una sola pestaña:** la base de datos del navegador solo admite una pestaña abierta a la vez. Con dos, la segunda no carga las actividades.
- **Pantalla estrecha:** si la ventana es pequeña, el simulador se pliega abajo («Simulador de GPS · Mostrar»).

## Grabar una actividad de prueba

1. En el panel **Simulador de GPS**, elige una ruta:
   - **Casa de Campo en bici** (14,8 km, con cuestas).
   - **Vuelta al Retiro corriendo** (5,8 km).
   - **Cargar un GPX…** con cualquier recorrido tuyo. Sirven los que exportan Strava, Garmin o Komoot.
2. Elige la **velocidad del tiempo**. A ×60, una hora de actividad pasa en un minuto. Las estadísticas salen igual que en tiempo real.
3. En la app, pulsa **Grabar**, elige la actividad y **Empezar**. El simulador empieza a mandar posiciones (una por segundo de reloj simulado) y se para al terminar.

Mientras grabas puedes:

- **Pararse / Seguir:** simula una parada, como un semáforo. Sirve para comprobar que el tiempo en movimiento y la distancia se detienen y el tiempo total sigue.
- **Volver a la salida:** reinicia la ruta.
- **Recargar la página:** la grabación se recupera, como cuando iOS cierra la app en segundo plano.

La velocidad depende de la actividad que grabes, no del GPX: unos 27 km/h en bici de carretera en llano, 18 km/h en BTT, 10,8 km/h corriendo y 4,9 km/h caminando. Va más despacio cuesta arriba y más rápido cuesta abajo. Las posiciones llevan un poco de error, como las del GPS real.

## El reloj acelerado

Al acelerar el tiempo, el reloj de la app se adelanta a la hora real: tras una hora a ×60, la app cree que es una hora más tarde. El panel avisa cuánto va por delante. Con **Volver a la hora real** se pone en hora; el botón solo aparece cuando no estás grabando.

## Lo que no se puede probar aquí

El simulador sustituye al GPS, pero no reproduce lo que solo pasa en el iPhone. Todo esto hay que probarlo en el dispositivo:

- La grabación **con la pantalla bloqueada** y los permisos de ubicación de iOS.
- La **Live Activity** de la pantalla bloqueada y la Dynamic Island ([ADR-0004](adr/0004-live-activity-nativa.md)). En el navegador no se muestra nada.
- El **mapa de Mapbox**. En el navegador se ve MapLibre con los mapas de OpenFreeMap: el aspecto y los estilos cambian un poco.
- El **consumo de batería** y la precisión real del GPS.
- Las **hojas de confirmación**, que en el navegador cubren toda la ventana y no solo el marco del iPhone.

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/simulator/` | Motor del simulador, lector de GPX, rutas de ejemplo, reloj acelerado y panel |
| `src/components/dev-shell.web.tsx` | Marco del iPhone y panel del simulador |
| `src/components/route-map.web.tsx` | Mapa con MapLibre (en el iPhone, `route-map.tsx` con Mapbox) |
| `src/tracking/location-source.web.ts` | El «GPS» del navegador: enciende y apaga el simulador |
| `src/tracking/location-task.web.ts` | Pasa las posiciones del simulador a la grabación |
| `src/lib/clock.web.ts` | Hora de la app en el navegador (la del simulador) |
| `src/hooks/use-color-scheme.web.ts` | Tema forzado con `?tema=` |

Los archivos `.web.ts(x)` solo entran en la versión web. La app del iPhone no los incluye.
