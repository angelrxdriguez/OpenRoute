// Solo hace falta para el entorno de pruebas en el navegador (`npm run web`).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite usa SQLite compilado a WebAssembly en el navegador. La app solo usa las funciones
// asíncronas, así que no necesita las cabeceras COOP/COEP que piden las síncronas.
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

module.exports = config;
