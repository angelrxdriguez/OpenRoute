# ADR-0004: Live Activity nativa para la pantalla bloqueada

**Estado:** Aceptada
**Fecha:** 2026-10-26
**Decide:** Ángel

## Contexto

Tras probar la fase 1 en el iPhone, se pide ver los datos de la grabación con la pantalla bloqueada, como hace Strava. En iOS eso es una **Live Activity**: una tarjeta en la pantalla bloqueada (y en la Dynamic Island) que pinta una extensión de la app con SwiftUI, aparte del código React Native.

La app se instala con **iloader** y un Apple ID gratuito (Sideloadly no funcionó). Eso condiciona cómo se pasan los datos a la extensión:

- La vía oficial de Expo, `expo-widgets`, pasa el diseño y los datos a la extensión por un **App Group** con un nombre fijo (`group.<bundle id>`).
- Al firmar, iloader cambia los identificadores: la app pasa a `com.angelrxdriguez.openroute.<TEAM ID>` y el App Group a `group.com.angelrxdriguez.openroute.<TEAM ID>`. Con Sideloadly y SideStore la firma gratuita ni siquiera da App Group. En ambos casos `expo-widgets` deja la tarjeta vacía.

## Decisión

Live Activity escrita en Swift, sin App Group:

- **Extensión** `targets/route-activity/` (SwiftUI). La genera `@bacons/apple-targets` en `expo prebuild`, así que la carpeta `ios/` sigue sin tocarse a mano.
- **Módulo nativo local** `modules/live-activity/` (Expo Modules). Inicia, actualiza y termina la Live Activity con ActivityKit. Los datos viajan en el `ContentState` de ActivityKit, que no necesita App Group.
- **JavaScript:** `src/tracking/live-activity.ts` prepara los datos ya formateados y con los colores de `theme.ts`, y la grabación los manda al empezar, al pausar o reanudar y como mucho cada 5 s. El tiempo en movimiento lo cuenta iOS solo entre actualizaciones. En el navegador, `live-activity.web.ts` no hace nada.
- Muestra la actividad (icono, color y nombre), si graba o está en pausa, el tiempo en movimiento, la distancia y la velocidad media. Al tocarla se abre la pantalla de grabación.

## Consecuencias

- **A favor:** no depende del nombre del App Group ni de cómo lo firme cada herramienta. No usa servicios de pago ni notificaciones push.
- **En contra:** hay que recompilar el `.ipa`. El tipo `RouteActivityAttributes` está copiado en la extensión y en el módulo: los dos archivos tienen que ser iguales. El Swift no se puede compilar en Windows: los errores aparecen en la compilación de GitHub Actions.
- **Riesgo:** iloader firma las extensiones con el perfil de la app principal. Si iOS no acepta la extensión así firmada, la app funciona igual pero sin Live Activity.
- **Si iOS cierra la app** a mitad de una grabación, la tarjeta deja de contar al cabo de 2 minutos y pide abrir OpenRoute. Al abrirla, la grabación se recupera y la tarjeta se sustituye por una nueva.
