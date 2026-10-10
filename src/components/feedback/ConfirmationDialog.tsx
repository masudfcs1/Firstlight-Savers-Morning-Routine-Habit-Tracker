import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { radii, spacing, useAppTheme } from '../../theme';
import { AnimatedPressable, AppText } from '../ui';

export type ConfirmationDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>['name'];
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
};

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  icon,
  onConfirm,
  onCancel,
  testID,
}: ConfirmationDialogProps) {
  const { colors, shadows } = useAppTheme();
  const resolvedIcon = icon ?? (destructive ? 'alert-triangle' : 'check-circle');
  const actionColor = destructive ? colors.danger : colors.action;

  return (
    <Modal
      animationType="fade"
      onRequestClose={loading ? undefined : onCancel}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View accessibilityViewIsModal style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close dialog"
          disabled={loading}
          onPress={onCancel}
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        />
        <View
          style={[
            styles.dialog,
            shadows.floating,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
          testID={testID}
        >
          <View style={[styles.icon, { backgroundColor: destructive ? `${colors.danger}18` : colors.surfaceMuted }]}>
            <Feather color={actionColor} name={resolvedIcon} size={25} />
          </View>
          <AppText align="center" style={styles.title} variant="heading">
            {title}
          </AppText>
          <AppText align="center" color={colors.textMuted} style={styles.message} variant="body">
            {message}
          </AppText>
          <View style={styles.actions}>
            <AnimatedPressable
              accessibilityRole="button"
              disabled={loading}
              onPress={onCancel}
              style={[styles.button, { backgroundColor: colors.surfaceMuted }]}
            >
              <AppText variant="bodyMedium">{cancelLabel}</AppText>
            </AnimatedPressable>
            <AnimatedPressable
              accessibilityRole="button"
              disabled={loading}
              haptic={destructive ? 'medium' : 'light'}
              onPress={onConfirm}
              style={[styles.button, { backgroundColor: actionColor }]}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <AppText color={colors.white} variant="bodyMedium">
                  {confirmLabel}
                </AppText>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  dialog: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: spacing.md },
  message: { marginTop: spacing.xs },
  actions: { width: '100%', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  button: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, paddingHorizontal: spacing.sm },
});
