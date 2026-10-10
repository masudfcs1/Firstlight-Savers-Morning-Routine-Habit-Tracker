import React from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { palette, radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText } from '../ui';

export type ActivityCompletionButtonProps = {
  onPress: () => void;
  completed?: boolean;
  loading?: boolean | undefined;
  disabled?: boolean;
  label?: string;
  completedLabel?: string;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function ActivityCompletionButton({
  onPress,
  completed = false,
  loading = false,
  disabled = false,
  label = 'Mark as complete',
  completedLabel = 'Activity completed',
  accentColor,
  style,
  testID,
}: ActivityCompletionButtonProps) {
  const { colors, shadows } = useAppTheme();
  const start = completed ? colors.success : accentColor ?? colors.primary;
  const end = completed ? colors.primary : palette.forestLight;

  return (
    <AnimatedPressable
      accessibilityLabel={completed ? completedLabel : label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading, checked: completed }}
      disabled={disabled || loading}
      haptic="medium"
      onPress={onPress}
      style={[styles.pressable, shadows.floating, style]}
      testID={testID}
    >
      <LinearGradient colors={[start, end]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.gradient}>
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.content}>
            <View style={[styles.icon, { borderColor: `${colors.white}80` }]}>
              <Feather color={colors.white} name={completed ? 'check' : 'sunrise'} size={19} />
            </View>
            <AppText color={colors.white} numberOfLines={1} variant="bodyMedium">
              {completed ? completedLabel : label}
            </AppText>
            <Feather color={`${colors.white}CC`} name={completed ? 'check-circle' : 'arrow-right'} size={18} />
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: { minHeight: 58, borderRadius: radii.lg, overflow: 'hidden' },
  gradient: { minHeight: 58, justifyContent: 'center', paddingHorizontal: spacing.md },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
