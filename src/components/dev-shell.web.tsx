import { useState, type PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SimulatorPanel } from '@/simulator/simulator-panel';

/** Tamaño de la pantalla de un iPhone 15 en puntos. */
const PHONE = { width: 393, height: 852 };
const PANEL_WIDTH = 340;

/**
 * Entorno de pruebas en el navegador: la app dentro de un marco del tamaño de un iPhone
 * y, al lado, el simulador de GPS. En pantallas estrechas el simulador va abajo, plegado.
 */
export function DevShell({ children }: PropsWithChildren) {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const wide = width >= PHONE.width + PANEL_WIDTH + Spacing.five * 3;

  if (!wide) {
    return (
      <View style={[styles.narrow, { backgroundColor: theme.background }]}>
        <View style={styles.app}>{children}</View>
        <View style={[styles.drawer, { borderTopColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((value) => !value)}
            style={styles.drawerHandle}>
            <ThemedText type="smallBold">Simulador de GPS</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {expanded ? 'Ocultar' : 'Mostrar'}
            </ThemedText>
          </Pressable>
          {expanded && (
            <ScrollView style={{ maxHeight: height * 0.5 }} contentContainerStyle={styles.drawerContent}>
              <SimulatorPanel />
            </ScrollView>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wide, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.phone,
          {
            height: Math.min(PHONE.height, height - Spacing.five * 2),
            borderColor: theme.border,
            backgroundColor: theme.background,
          },
        ]}>
        {children}
      </View>
      <ScrollView
        style={[styles.panel, { maxHeight: height - Spacing.five * 2, backgroundColor: theme.background }]}
        contentContainerStyle={styles.panelContent}>
        <SimulatorPanel />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  narrow: {
    flex: 1,
  },
  app: {
    flex: 1,
  },
  drawer: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  drawerHandle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  drawerContent: {
    padding: Spacing.three,
    paddingTop: 0,
  },
  wide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.five,
  },
  phone: {
    width: PHONE.width,
    borderRadius: 44,
    borderWidth: 8,
    overflow: 'hidden',
  },
  panel: {
    width: PANEL_WIDTH,
    flexGrow: 0,
    borderRadius: Radius.large,
  },
  panelContent: {
    padding: Spacing.four,
  },
});
