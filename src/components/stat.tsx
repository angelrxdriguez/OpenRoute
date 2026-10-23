import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import type { Measure } from '@/stats/format';

type Props = {
  label: string;
  measure: Measure | string;
  size?: 'hero' | 'large' | 'medium' | 'small';
  style?: StyleProp<ViewStyle>;
};

const VALUE_SIZE = { hero: 64, large: 40, medium: 28, small: 20 } as const;

/** Un dato con su etiqueta: la cifra grande y la unidad más pequeña y en gris. */
export function Stat({ label, measure, size = 'medium', style }: Props) {
  const { value, unit } = typeof measure === 'string' ? { value: measure, unit: '' } : measure;
  const fontSize = VALUE_SIZE[size];

  return (
    <View style={[styles.container, style]} accessible accessibilityLabel={`${label}: ${value} ${unit}`}>
      <ThemedText style={[styles.value, { fontSize, lineHeight: fontSize * 1.15 }]}>
        {value}
        {unit ? (
          <ThemedText themeColor="textSecondary" style={[styles.unit, { fontSize: Math.max(13, fontSize * 0.4) }]}>
            {` ${unit}`}
          </ThemedText>
        ) : null}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  value: {
    fontFamily: Fonts?.rounded,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontWeight: 600,
  },
});
