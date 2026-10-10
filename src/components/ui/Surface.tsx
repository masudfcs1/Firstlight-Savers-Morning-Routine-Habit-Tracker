import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radii, spacing, useAppTheme } from '../../theme';

export type SurfaceProps = PropsWithChildren<{
  elevated?: boolean;
  muted?: boolean;
  bordered?: boolean;
  padding?: keyof typeof spacing | number;
  radius?: keyof typeof radii | number;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
}>;

export function Surface({
  children,
  elevated = false,
  muted = false,
  bordered = true,
  padding = 'lg',
  radius = 'lg',
  style,
  testID,
}: SurfaceProps) {
  const { colors, shadows } = useAppTheme();
  const paddingValue = typeof padding === 'number' ? padding : spacing[padding];
  const radiusValue = typeof radius === 'number' ? radius : radii[radius];

  return (
    <View
      style={[
        styles.base,
        {
          padding: paddingValue,
          borderRadius: radiusValue,
          backgroundColor: muted
            ? colors.surfaceMuted
            : elevated
              ? colors.surfaceElevated
              : colors.surface,
          borderColor: colors.border,
          borderWidth: bordered ? StyleSheet.hairlineWidth : 0,
        },
        elevated && shadows.card,
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
