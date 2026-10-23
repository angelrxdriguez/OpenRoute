# OpenRoute

App privada para registrar actividades al aire libre (bici de carretera, bici de montaña, correr y caminar): grabación GPS con la pantalla bloqueada, estadísticas detalladas y el recorrido en el mapa. Sin parte social y con todos los datos en el propio iPhone.

> Estado: **stack montado y paleta elegida**. La lógica de la app todavía no está implementada.

## Stack

Expo (SDK 58) · React Native 0.88 · TypeScript · Expo Router · expo-location + expo-task-manager (GPS en segundo plano) · expo-sqlite · Mapbox (`@rnmapbox/maps`) · Zustand · Jest · ESLint.

Por qué este stack y cómo se distribuye gratis: [docs/adr/0001-stack-y-distribucion.md](docs/adr/0001-stack-y-distribucion.md).

## Diseño

Paleta **Volt**: blanco y negro con un único acento amarillo flúor (`#D4F53C`) y un color por actividad. Tokens en [src/constants/theme.ts](src/constants/theme.ts); decisión y reglas de uso en [docs/adr/0002-paleta-volt.md](docs/adr/0002-paleta-volt.md). Las propuestas comparadas están en [docs/diseno/paletas-propuestas.html](docs/diseno/paletas-propuestas.html).

## Empezar

```bash
npm install
cp .env.example .env.local   # y pon tu token público de Mapbox
npm start                    # servidor de desarrollo; el iPhone se conecta con la build "development"
npm test
npm run typecheck
npx expo lint
```

Para instalarla en el iPhone: [docs/instalacion-iphone.md](docs/instalacion-iphone.md).

## Estructura

```
src/
  app/              Pantallas (Expo Router): cada archivo es una ruta
  components/       Componentes de interfaz
  constants/        Tema (colores, espaciados)
  hooks/            Hooks de React
  lib/              Configuración de librerías (Mapbox)
docs/               Decisiones (ADR), guías y propuestas de diseño
.github/workflows/  CI (lint, tipos, tests) y compilación del .ipa para iPhone
```
