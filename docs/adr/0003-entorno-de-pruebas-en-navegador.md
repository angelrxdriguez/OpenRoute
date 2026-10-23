# ADR-0003: Entorno de pruebas en el navegador

**Estado:** Aceptada
**Fecha:** 2026-10-23
**Decide:** Ángel

## Contexto

La app solo se puede probar instalándola en el iPhone (ADR-0001), y eso necesita cable para la primera instalación, renovar cada 7 días y salir a la calle para tener GPS. Así cuesta mucho ver una pantalla o comprobar una grabación entera.

## Decisión

La misma app se ejecuta también en el navegador (Expo web), solo como entorno de pruebas. Lo que en el navegador no existe se sustituye con archivos `.web.ts(x)`, que Metro elige solo al compilar para web:

- **Mapa:** MapLibre GL JS (`maplibre-gl` 5) con los mapas gratuitos de OpenFreeMap, sin cuenta ni token. Se usa la versión 5 porque la 6 carga su worker con `import.meta.url`, que Metro no resuelve.
- **GPS:** un simulador que recorre una ruta (dos de ejemplo en Madrid o cualquier GPX) a la velocidad típica de cada actividad, con error de posición realista. Hace de GPS del iPhone: se enciende y apaga cuando la app enciende y apaga la localización, y sus posiciones entran por el mismo camino (`handleLocationBatch`) que las de iOS.
- **Reloj:** acelerable (×1 a ×60) para probar una actividad de una hora en un minuto. La app pide la hora a `src/lib/clock.ts`, que en el navegador devuelve la del simulador.
- **Base de datos:** el mismo `expo-sqlite`, que en web usa SQLite en WebAssembly sobre el almacenamiento privado del navegador (OPFS). Solo usamos funciones asíncronas, así que no hacen falta las cabeceras COOP/COEP.
- **Confirmaciones:** una hoja propia (`ConfirmSheet`) en vez de `Alert`, que en el navegador no hace nada.

## Consecuencias

- **A favor:** se puede probar casi todo sin el iPhone y sin coste. Las dependencias nuevas (`maplibre-gl`, `@expo/metro-runtime`) son solo JavaScript y solo entran en la versión web: no obligan a recompilar el `.ipa`.
- **En contra:** hay dos implementaciones del mapa y de la fuente de posiciones que mantener a la par. La de iOS (Mapbox, `expo-location`) no se ejecuta en el navegador, así que sus cambios solo se comprueban en el iPhone.
- **No sustituye al iPhone:** el segundo plano, los permisos, la batería y el GPS real hay que probarlos en el dispositivo. Detalle en [pruebas-en-chrome.md](../pruebas-en-chrome.md).
