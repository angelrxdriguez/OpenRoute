import { useColorScheme as useSystemColorScheme } from 'react-native';

/**
 * En el navegador se puede forzar el tema añadiendo `?tema=claro` o `?tema=oscuro` a la URL,
 * para probar los dos sin cambiar el del sistema. Se lee al cargar la página.
 */
const forced = (() => {
  try {
    const value = new URLSearchParams(window.location.search).get('tema');
    return value === 'claro' ? 'light' : value === 'oscuro' ? 'dark' : null;
  } catch {
    return null;
  }
})();

export function useColorScheme() {
  const system = useSystemColorScheme();
  return forced ?? system;
}
