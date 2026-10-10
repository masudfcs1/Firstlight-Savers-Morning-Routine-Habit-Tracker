import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText } from '../ui';

export type EmptyStateProps = {
  title: string;
  message: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function EmptyState({
  title,
  message,
  icon = 'sunrise',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  style,
  testID,
}: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, compact && styles.containerCompact, style]} testID={testID}>
      <View style={[styles.illustration, compact && styles.illustrationCompact]}>
        <View style={[styles.orbitLarge, { borderColor: colors.border }]} />
        <View style={[styles.orbitSmall, { borderColor: colors.accentSoft }]} />
        <View style={[styles.sun, { backgroundColor: colors.accentSoft }]}>
          <Feather color={colors.warning} name={icon} size={compact ? 25 : 34} />
        </View>
        <View style={[styles.leaf, { backgroundColor: colors.sage }]} />
      </View>
      <AppText align="center" style={styles.title} variant={compact ? 'subheading' : 'heading'}>
        {title}
      </AppText>
      <AppText align="center" color={colors.textMuted} style={styles.message} variant="body">
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AnimatedPressable
          accessibilityRole="button"
          haptic="light"
          onPress={onAction}
          style={[styles.action, { backgroundColor: colors.action }]}
        >
          <AppText color={colors.white} variant="bodyMedium">
            {actionLabel}
          </AppText>
          <Feather color={colors.white} name="arrow-right" size={18} />
        </AnimatedPressable>
      ) : null}
      {secondaryActionLabel && onSecondaryAction ? (
        <AnimatedPressable onPress={onSecondaryAction} style={styles.secondaryAction}>
          <AppText color={colors.primary} variant="bodyMedium">
            {secondaryActionLabel}
          </AppText>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['4xl'], paddingHorizontal: spacing.xl },
  containerCompact: { paddingVertical: spacing.xl },
  illustration: { width: 130, height: 118, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  illustrationCompact: { width: 94, height: 82 },
  orbitLarge: { position: 'absolute', width: '92%', height: '92%', borderRadius: 999, borderWidth: 1 },
  orbitSmall: { position: 'absolute', width: '68%', height: '68%', borderRadius: 999, borderWidth: 1 },
  sun: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center' },
  leaf: { position: 'absolute', right: 15, bottom: 12, width: 23, height: 13, borderTopLeftRadius: 13, borderBottomRightRadius: 13, transform: [{ rotate: '-23deg' }] },
  title: { marginTop: spacing.xs },
  message: { maxWidth: 340, marginTop: spacing.xs },
  action: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
  },
  secondaryAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, marginTop: spacing.xs },
});
