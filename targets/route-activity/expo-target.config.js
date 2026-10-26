// Extensión que pinta la Live Activity de la grabación (pantalla bloqueada y Dynamic Island).
// La genera @bacons/apple-targets en `expo prebuild`; ver docs/adr/0004-live-activity-nativa.md.
// Sin `entitlements` a propósito: con un App Group, la firma con Apple ID gratuito la rompería.

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'RouteActivity',
  displayName: 'OpenRoute',
  bundleIdentifier: '.routeactivity',
  // La misma versión mínima de iOS que la app (Expo SDK 58).
  deploymentTarget: '16.4',
  frameworks: ['ActivityKit'],
};
