import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SheetAction = {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  /** Al tocar fuera o cerrar con el gesto del sistema. */
  onCancel: () => void;
};

/**
 * Hoja de confirmación desde abajo. Se usa en vez de `Alert` porque en el navegador
 * (entorno de pruebas) `Alert` no hace nada.
 */
export function ConfirmSheet({ visible, title, message, actions, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Cerrar"
          style={[styles.backdrop, { backgroundColor: theme.overlay }]}
          onPress={onCancel}
        />
        <ThemedView style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <View style={styles.texts}>
            <ThemedText type="smallBold" style={styles.title}>
              {title}
            </ThemedText>
            {message ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.message}>
                {message}
              </ThemedText>
            ) : null}
          </View>
          {actions.map((action) => (
            <Button key={action.title} title={action.title} variant={action.variant} onPress={action.onPress} />
          ))}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  texts: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  title: {
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});
