import { Platform } from 'react-native';

/**
 * Paleta «Volt»: blanco y negro con un único acento amarillo flúor.
 * Decisión y reglas de uso en docs/adr/0002-paleta-volt.md.
 * Regla clave: `accent` nunca va como texto ni como trazo sobre fondo claro (1,2:1);
 * en claro solo se usa de relleno con texto negro encima.
 */
export const Colors = {
  light: {
    text: '#0A0A0A',
    background: '#FFFFFF',
    backgroundElement: '#F2F2F2',
    backgroundSelected: '#E2E2E2',
    textSecondary: '#616161',
    border: '#E2E2E2',
    /** Botón principal y posición actual en el mapa. */
    tint: '#111111',
    onTint: '#FFFFFF',
    accent: '#D4F53C',
    onAccent: '#0A0A0A',
    danger: '#D93025',
    onDanger: '#FFFFFF',
    /** Estado «en pausa». Solo como indicador junto a su texto (2:1 sobre blanco). */
    warning: '#F5A623',
    /** Ruta en el mapa: siempre amarilla con borde casi negro, para que el amarillo quede sobre negro. */
    route: '#D4F53C',
    routeCasing: '#0A0A0A',
    /** Lo que queda por recorrer en la repetición. */
    routeMuted: 'rgba(10, 10, 10, 0.35)',
    /** Borde del punto de tu posición en el mapa. */
    markerRing: '#FFFFFF',
    /** Velo detrás de las hojas de confirmación. */
    overlay: 'rgba(0, 0, 0, 0.45)',
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    backgroundElement: '#141414',
    backgroundSelected: '#262626',
    textSecondary: '#A3A3A3',
    border: '#262626',
    tint: '#D4F53C',
    onTint: '#0A0A0A',
    accent: '#D4F53C',
    onAccent: '#0A0A0A',
    danger: '#D93025',
    onDanger: '#FFFFFF',
    warning: '#F5A623',
    route: '#D4F53C',
    routeCasing: '#0E1012',
    routeMuted: 'rgba(255, 255, 255, 0.35)',
    markerRing: '#0E1012',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Color de cada actividad en listas y gráficas (en el mapa, la ruta va siempre en `route`). Comprobados para que se distingan
 * entre sí también con daltonismo rojo-verde y se lean sobre la app y sobre el mapa.
 * Siempre van acompañados del icono y el nombre de la actividad, nunca solo el color.
 */
export const ActivityColors = {
  light: { road_bike: '#FD2E22', mtb: '#2D924C', run: '#3965AA', walk: '#9B55E8' },
  dark: { road_bike: '#FB4B11', mtb: '#35A766', run: '#2178B2', walk: '#A671EC' },
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  /** Solo para el entorno de pruebas en el navegador. */
  web: {
    sans: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', ui-rounded, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 22,
} as const;
