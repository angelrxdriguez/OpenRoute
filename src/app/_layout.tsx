// La tarea de GPS tiene que quedar registrada antes de montar cualquier pantalla.
import '@/tracking/location-task';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { useEffect } from 'react';

import { DevShell } from '@/components/dev-shell';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { restoreRecording } from '@/tracking/recorder';

function navigationTheme(scheme: 'light' | 'dark'): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[scheme];
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.tint,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
}

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    restoreRecording().catch((error: unknown) => {
      console.warn('[OpenRoute] No se pudo recuperar la grabación en curso', error);
    });
  }, []);

  return (
    <ThemeProvider value={navigationTheme(scheme)}>
      <DevShell>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Actividades', headerLargeTitle: true }} />
          <Stack.Screen
            name="record"
            options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen name="activity/[id]" options={{ title: '', headerBackTitle: 'Actividades' }} />
        </Stack>
      </DevShell>
    </ThemeProvider>
  );
}
