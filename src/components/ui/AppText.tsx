import React from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { typography, useAppTheme } from '../../theme';

export type AppTextVariant = keyof typeof typography;

export type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
};

export function AppText({
  variant = 'body',
  color,
  align,
  style,
  maxFontSizeMultiplier = 1.5,
  ...props
}: AppTextProps) {
  const { colors } = useAppTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.base,
        typography[variant],
        { color: color ?? colors.text, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
