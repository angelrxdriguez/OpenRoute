@AGENTS.md

## OpenRoute

- App privada tipo Strava solo para iPhone. Interfaz, textos y documentación en **español**.
- Se desarrolla en Windows: no hay Xcode ni `expo prebuild` para iOS en local. El `.ipa` se compila en GitHub Actions (`.github/workflows/ios-build.yml`) y se instala con Sideloadly. Decisión en `docs/adr/0001-stack-y-distribucion.md`.
- Coste cero hasta comercializar: nada de EAS Build, Apple Developer ni servicios de pago sin preguntar.
- Añadir una dependencia nativa obliga a recompilar el `.ipa`. Evítalo si no hace falta y avisa cuando ocurra.
- Avanza por fases y solo con lo que se pida en cada momento: no adelantes lógica que no se haya pedido.
- Antes de dar algo por terminado: `npx expo lint`, `npm run typecheck`, `npm test`.

## Diseño

- Paleta **Volt** (`docs/adr/0002-paleta-volt.md`). Usa siempre los tokens de `src/constants/theme.ts` (`Colors`, `ActivityColors`); no escribas colores sueltos en los componentes.
- El amarillo `accent` (`#D4F53C`) nunca va como texto ni como línea sobre fondo claro: solo de relleno con texto negro, o sobre negro.
- Los colores de actividad siempre van con su icono y su nombre.

## Estado actual (actualízalo al cerrar cada fase)

- **Hecho:** stack montado (ADR-0001) y paleta Volt elegida y aplicada en `theme.ts` (ADR-0002). La app solo tiene una pantalla provisional con un mapa.
- **Siguiente:** empezar con las funcionalidades.
- **Propuesto, sin confirmar todavía por el usuario:** un entorno de pruebas en Chrome para no depender del iPhone ni registrarse en Mapbox. Sería Expo web, MapLibre con OpenFreeMap solo en web y un simulador de GPS que reproduce rutas GPX. Pregunta antes de montarlo.
- **Borrador aparcado:** en `git stash` («Lógica inicial…») hay una primera versión de la base de datos SQLite, la grabación GPS en segundo plano, el motor de estadísticas con 24 tests y tres pantallas. Se apartó porque se pidió montar solo el stack. Revísala con `git stash show -p --include-untracked stash@{0}` antes de reescribir esa parte desde cero. Usa la paleta antigua y archivos que ya cambiaron (`_layout.tsx`, `index.tsx`), así que no la apliques tal cual.
