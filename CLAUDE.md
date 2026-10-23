@AGENTS.md

## OpenRoute

- App privada tipo Strava solo para iPhone. Interfaz, textos y documentación en **español**.
- Se desarrolla en Windows: no hay Xcode ni `expo prebuild` para iOS en local. El `.ipa` se compila en GitHub Actions (`.github/workflows/ios-build.yml`) y se instala con Sideloadly. Decisión en `docs/adr/0001-stack-y-distribucion.md`.
- Coste cero hasta comercializar: nada de EAS Build, Apple Developer ni servicios de pago sin preguntar.
- Añadir una dependencia nativa obliga a recompilar el `.ipa`. Evítalo si no hace falta y avisa cuando ocurra.
- Avanza por fases y solo con lo que se pida en cada momento: no adelantes lógica que no se haya pedido.
- Antes de dar algo por terminado: `npx expo lint`, `npm run typecheck`, `npm test`.
- La app también corre en Chrome como entorno de pruebas (`npm run web`, ADR-0003). Lo que cambia entre iPhone y navegador va en archivos `.web.ts(x)` junto al original. Para confirmar usa `ConfirmSheet`, no `Alert`, que en web no hace nada. Pide la hora a `@/lib/clock`, no a `Date.now()`.

## Diseño

- Paleta **Volt** (`docs/adr/0002-paleta-volt.md`). Usa siempre los tokens de `src/constants/theme.ts` (`Colors`, `ActivityColors`); no escribas colores sueltos en los componentes.
- El amarillo `accent` (`#D4F53C`) nunca va como texto ni como línea sobre fondo claro: solo de relleno con texto negro, o sobre negro.
- Los colores de actividad siempre van con su icono y su nombre.

## Estado actual (actualízalo al cerrar cada fase)

- **Hecho:** stack (ADR-0001), paleta Volt (ADR-0002) e icono de la app con el logo.
- **Hecho, fase 1 «grabar, lista y detalle»** (decisiones del usuario: navegación con lista y botón «Grabar», sin pestañas; pantalla de grabación con el mapa arriba y los datos abajo):
  - Grabar: elegir actividad, empezar, pausar, reanudar, terminar, guardar o descartar, y recuperar la grabación si iOS cierra la app.
  - Lista de actividades con el resumen de la semana, y detalle con mapa, estadísticas y parciales.
  - Basta con el permiso de ubicación «Al usar la app»: no se pide «Siempre».
  - Se aprovechó el borrador que estaba en `git stash`, adaptado a la paleta Volt. Ese stash ya sobra: pregunta al usuario antes de borrarlo.
- **Hecho:** entorno de pruebas en Chrome (ADR-0003, `docs/pruebas-en-chrome.md`). Con él se probó toda la fase 1, en claro y en oscuro.
- **Pendiente de probar en el iPhone:** todo lo nativo, que el navegador no ejecuta: Mapbox, permisos, GPS real y grabación con la pantalla bloqueada. El `.ipa` de desarrollo ya está compilado; falta instalarlo, porque el usuario no tenía cable.
- **Siguiente:** que el usuario revise la fase 1. La repetición animada de la ruta queda para otra fase.
