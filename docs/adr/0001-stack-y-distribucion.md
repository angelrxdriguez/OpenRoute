# ADR-0001: Stack tecnológico y distribución gratuita en iPhone

**Estado:** Aceptada
**Fecha:** 2026-10-23
**Decide:** Ángel (propietario y único usuario mientras la app se pule)

## Contexto

OpenRoute es una app privada para registrar actividades deportivas al aire libre, al estilo Strava pero sin parte social. Para empezar solo se contemplan cuatro actividades: bici de carretera, bici de montaña, correr y caminar.

Lo que tiene que hacer:

- Grabar la ruta por GPS **con la pantalla bloqueada y la app en segundo plano** durante horas.
- Calcular estadísticas de cada actividad: distancia, velocidad media y máxima, ritmo, tiempo en movimiento, ascenso y descenso.
- Mostrar el recorrido en un mapa y, más adelante, una **simulación animada del trayecto** sobre terreno 3D.

Restricciones:

- El único dispositivo objetivo es un **iPhone**.
- Se desarrolla desde **Windows**, sin Mac. Xcode solo funciona en macOS.
- **Coste cero** hasta que se decida comercializar la app.
- Los datos son personales y deben quedarse en el dispositivo.

## Decisión

1. **App nativa con Expo (React Native) y TypeScript**, usando Expo Router para la navegación.
2. **Grabación GPS con `expo-location` y `expo-task-manager`**, con el modo de ubicación en segundo plano de iOS (`UIBackgroundModes: location`), `ActivityType.Fitness` y precisión `BestForNavigation`.
3. **Mapas con Mapbox (`@rnmapbox/maps`)**, estilo Outdoors y terreno 3D para la simulación.
4. **Datos locales en SQLite (`expo-sqlite`)**, sin servidor. Se guardarán todos los puntos GPS en bruto y las estadísticas se calcularán con funciones puras y testeadas.
5. **Distribución gratuita:** el `.ipa` se compila **sin firmar en GitHub Actions** (macOS en la nube) y se instala con **Sideloadly** usando un Apple ID gratuito.
   > Actualización 2026-10-26: Sideloadly no funcionó y se instala con **iloader**, que también es gratuito. El resto de la decisión no cambia (ver `docs/instalacion-iphone.md`).
6. Se pasará al **Apple Developer Program (99 €/año)** y a **EAS Build y TestFlight** solo cuando se quiera comercializar la app o deje de compensar renovarla cada semana.

## Opciones consideradas

### A. Expo / React Native con TypeScript (elegida)

| Dimensión | Valoración |
|---|---|
| Complejidad | Media |
| Coste | 0 € (con distribución mediante Sideloadly) |
| GPS en segundo plano | Sí, nativo |
| Familiaridad | Alta: TypeScript y React, cercanos al desarrollo web |
| Compilar desde Windows | Sí, en la nube (GitHub Actions o EAS) |

**A favor:** el JavaScript se recarga en caliente desde el PC al iPhone; acceso a módulos nativos (GPS, SQLite, Mapbox y, más adelante, HealthKit); y no hace falta Mac.
**En contra:** cada cambio de dependencia nativa obliga a recompilar, y hay una capa de abstracción sobre iOS.

### B. Swift / SwiftUI nativo

| Dimensión | Valoración |
|---|---|
| Complejidad | Media |
| Coste | Requiere un Mac |
| GPS en segundo plano | Sí, la mejor integración |
| Familiaridad | Baja |
| Compilar desde Windows | No |

**A favor:** la mejor integración con iOS, Apple Watch, Live Activities y MapKit.
**En contra:** inviable sin Mac. Queda descartada mientras no haya uno.

### C. Web app instalable (PWA)

| Dimensión | Valoración |
|---|---|
| Complejidad | Baja |
| Coste | 0 € |
| GPS en segundo plano | **No**: Safari corta la geolocalización al bloquear la pantalla |
| Familiaridad | Alta |

**En contra:** no puede grabar con el móvil en el bolsillo. Queda descartada para grabar, aunque podría servir en el futuro como visor web de actividades.

### Mapas: Mapbox frente a MapLibre

- **Mapbox:** terreno 3D estable, estilo Outdoors con curvas de nivel y senderos, y control de cámara para la simulación. La cuenta gratuita sin tarjeta permite hasta 100 usuarios activos al mes en móvil, y para un solo usuario sobra. Desde la v11.8 del SDK de iOS ya no hace falta token secreto para compilar; solo un token público (`pk.…`).
- **MapLibre:** 100 % libre y sin cuenta, pero en octubre de 2026 el terreno 3D en MapLibre Native sigue en desarrollo y no está en las versiones estables.

Se elige Mapbox. Si en el futuro se quiere prescindir de él, MapLibre tiene una API casi idéntica.

### Distribución en iPhone

| Opción | Coste | Duración de la instalación | Notas |
|---|---|---|---|
| Expo Go | 0 € | — | No sirve: no admite Mapbox ni ubicación en segundo plano |
| **GitHub Actions + Sideloadly (elegida)** | 0 € | 7 días, renovable | Renovación automática por Wi-Fi o manual en 1 minuto. Los datos se conservan |
| Apple Developer + EAS (ad hoc o TestFlight) | 99 €/año | 1 año (ad hoc) o 90 días (TestFlight) | Más cómodo. Necesario para comercializar |

Si el repositorio es privado, GitHub Actions tiene en el plan gratuito unos 2.000 minutos al mes, y macOS cuenta ×10. Eso da para unas 8-10 compilaciones al mes, más que suficiente porque solo se recompila cuando cambian las dependencias nativas. El día a día se hace con recarga en caliente desde el PC.

## Análisis

La restricción que decide todo es el **GPS con la pantalla bloqueada**, que deja fuera la PWA. La segunda es **no tener Mac**, que deja fuera Swift. Expo es la única opción que cumple ambas. La distribución con Sideloadly cambia 99 €/año por una renovación semanal que se puede automatizar, y el código es idéntico en ambos casos: pasar a la cuenta de pago solo cambia la forma de compilar e instalar.

## Consecuencias

- **Más fácil:** desarrollar desde Windows con recarga en caliente en el iPhone, sin costes, y con los datos solo en el dispositivo.
- **Más difícil:** cada compilación nativa pasa por GitHub Actions (unos 20 minutos) y luego por Sideloadly. No se puede depurar código nativo de iOS en local.
- **Riesgo:** Sideloadly y AltStore dependen de que Apple no cambie el sistema de firma gratuita. Plan B: pagar los 99 € y pasar a EAS.
- **Riesgo:** la altitud del GPS es ruidosa. El desnivel se calculará con suavizado e histéresis, y se podrá afinar después con el barómetro o con un modelo digital de elevación, sin perder datos, porque se guardarán los puntos en bruto.
- **Revisar** esta decisión si se consigue un Mac, si se quiere comercializar o si MapLibre publica el terreno 3D en estable.

## Tareas

**Montar el stack (hecho):**

1. [x] Proyecto Expo (SDK 58, React Native 0.88) con TypeScript y Expo Router.
2. [x] Dependencias instaladas: `expo-location`, `expo-task-manager`, `expo-sqlite`, `@rnmapbox/maps`, `zustand` y `expo-dev-client`.
3. [x] `app.json`: bundle id, permisos de ubicación en español, ubicación en segundo plano (`UIBackgroundModes: location`) y plugins de SQLite y Mapbox.
4. [x] Calidad: ESLint, TypeScript estricto y Jest.
5. [x] GitHub Actions: CI (lint, tipos y tests) y compilación del `.ipa` sin firmar.
6. [x] Pantalla provisional con mapa para comprobar el stack en el iPhone.

**Siguiente:**

7. [ ] Primera instalación en el iPhone con Sideloadly (ver `docs/instalacion-iphone.md`).
8. [ ] Lógica de la app: base de datos, grabación GPS, estadísticas y pantallas.
9. [ ] Más adelante: gráficas de velocidad y altitud, simulación 3D del recorrido, exportar e importar GPX.
