import React, { type PropsWithChildren } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import {
  darkColors,
  darkShadows,
  lightColors,
  lightShadows,
  palette,
  radii,
  spacing,
  typography,
  useAppTheme,
} from "../../theme";

export function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function useChartTheme(dark?: boolean | undefined) {
  const appTheme = useAppTheme();
  const isDark = dark ?? appTheme.isDark;

  return {
    isDark,
    colors: isDark ? darkColors : lightColors,
    shadows: isDark ? darkShadows : lightShadows,
    chart: {
      grid: isDark ? "rgba(184, 201, 175, 0.16)" : "rgba(41, 45, 43, 0.10)",
      track: isDark ? "#29473F" : "#EEF0E9",
      noRecord: isDark ? "#436057" : "#D5D1C8",
      tooltip: isDark ? "#F4F1E9" : palette.forest,
      tooltipText: isDark ? palette.forestDark : palette.white,
    },
  };
}

export type ChartFrameProps = PropsWithChildren<{
  title: string;
  subtitle?: string | undefined;
  metric?: string | undefined;
  dark?: boolean | undefined;
  interactive?: boolean | undefined;
  accessibilityLabel?: string | undefined;
  onLayout?: ((event: LayoutChangeEvent) => void) | undefined;
  style?: StyleProp<ViewStyle> | undefined;
}>;

export function ChartFrame({
  title,
  subtitle,
  metric,
  dark,
  interactive = false,
  accessibilityLabel,
  onLayout,
  style,
  children,
}: ChartFrameProps) {
  const { colors, shadows } = useChartTheme(dark);

  return (
    <View
      accessible={!interactive}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={interactive ? undefined : "image"}
      onLayout={onLayout}
      style={[
        styles.frame,
        shadows.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.title, { color: colors.text }]}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              maxFontSizeMultiplier={1.4}
              style={[styles.subtitle, { color: colors.textMuted }]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {metric ? (
          <View style={[styles.metric, { backgroundColor: colors.accentSoft }]}>
            <Text
              maxFontSizeMultiplier={1.25}
              style={[styles.metricText, { color: colors.warning }]}
            >
              {metric}
            </Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function EmptyChartState({
  message,
  dark,
}: {
  message: string;
  dark?: boolean | undefined;
}) {
  const { colors, isDark } = useChartTheme(dark);

  return (
    <View accessible accessibilityLabel={message} style={styles.empty}>
      <Svg
        accessibilityElementsHidden
        height={58}
        width={72}
        viewBox="0 0 72 58"
      >
        <Path
          d="M8 47 C20 37 27 42 36 32 C45 22 51 29 64 13"
          fill="none"
          stroke={isDark ? colors.sage : palette.sageDark}
          strokeDasharray="3 5"
          strokeLinecap="round"
          strokeWidth={2}
        />
        <Circle cx={64} cy={13} fill={colors.accentSoft} r={8} />
        <Circle cx={64} cy={13} fill={colors.accent} r={3.5} />
      </Svg>
      <Text
        maxFontSizeMultiplier={1.4}
        style={[styles.emptyText, { color: colors.textMuted }]}
      >
        {message}
      </Text>
    </View>
  );
}

export function formatCompactNumber(value: number): string {
  const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
  if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}m`;
  if (safeValue >= 1_000) return `${(safeValue / 1_000).toFixed(1)}k`;
  return Number.isInteger(safeValue) ? String(safeValue) : safeValue.toFixed(1);
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    ...typography.subheading,
    includeFontPadding: false,
  },
  subtitle: {
    ...typography.caption,
    includeFontPadding: false,
  },
  metric: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  metricText: {
    ...typography.overline,
    includeFontPadding: false,
    letterSpacing: 0.6,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 156,
    paddingBottom: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    includeFontPadding: false,
    maxWidth: 230,
    textAlign: "center",
  },
});
