import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { ACTIVITY_TYPE_CONFIG, type ActivityType } from '@/domain/activity-types';
import { useActivityColor } from '@/hooks/use-activity-color';

export function ActivityIcon({ type, size = 44 }: { type: ActivityType; size?: number }) {
  const color = useActivityColor(type);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        // El color de la actividad con un 13 % de opacidad para el fondo.
        backgroundColor: `${color}22`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <SymbolView name={ACTIVITY_TYPE_CONFIG[type].icon} tintColor={color} size={size * 0.55} />
    </View>
  );
}
