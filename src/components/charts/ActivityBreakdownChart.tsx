import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, G, Text as SvgText } from "react-native-svg";

import {
  activityPalette,
  palette,
  radii,
  spacing,
  typography,
} from "../../theme";
import {
  ChartFrame,
  EmptyChartState,
  formatCompactNumber,
  useChartTheme,
} from "./_shared";

export type ActivityBreakdownDatum = {
  id?: string | undefined;
  activityId: string;
  label?: string | undefined;
  /** Preferred analytics-layer input. */
  completedSeconds?: number | undefined;
  /** Convenience input for callers that already aggregate in minutes. */
  minutes?: number | undefined;
  sharePercentage?: number | undefined;
  color?: string | undefined;
};

export type ActivityBreakdownChartProps = {
  data: readonly ActivityBreakdownDatum[];
  title?: string | undefined;
  subtitle?: string | undefined;
  dark?: boolean | undefined;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  selectedId?: string | undefined;
  onSelect?:
    ((datum: ActivityBreakdownDatum, index: number) => void) | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

type NormalizedActivity = {
  datum: ActivityBreakdownDatum;
  index: number;
  identity: string;
  key: string;
  label: string;
  completedSeconds: number;
  color: string;
};

type ActivitySegment = NormalizedActivity & {
  dashLength: number;
  offset: number;
  percentage: number;
  rawLength: number;
};

const FALLBACK_COLORS = [
  palette.moss,
  palette.amber,
  palette.plum,
  palette.rose,
  palette.sky,
  palette.sageDark,
] as const;

function humanizeActivityId(activityId: string): string {
  return activityId
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function colorForActivity(activityId: string, index: number): string {
  const normalizedId = activityId.toUpperCase() as keyof typeof activityPalette;
  return (
    activityPalette[normalizedId] ??
    FALLBACK_COLORS[index % FALLBACK_COLORS.length] ??
    palette.moss
  );
}

function formatMinutes(seconds: number): string {
  const minutes = seconds / 60;
  if (minutes >= 1000) return formatCompactNumber(minutes);
  if (minutes >= 10 || Number.isInteger(minutes))
    return String(Math.round(minutes));
  return minutes.toFixed(1);
}

export function ActivityBreakdownChart({
  data,
  title = "Activity balance",
  subtitle = "Completed time across S.A.V.E.R.S.",
  dark,
  size = 178,
  strokeWidth = 18,
  selectedId,
  onSelect,
  style,
}: ActivityBreakdownChartProps) {
  const { colors, chart } = useChartTheme(dark);

  const activities = useMemo<NormalizedActivity[]>(
    () =>
      data.map((datum, index) => {
        const secondsCandidate =
          datum.completedSeconds ??
          (datum.minutes !== undefined ? datum.minutes * 60 : 0);
        const identity = datum.id ?? datum.activityId;
        return {
          datum,
          index,
          identity,
          key: `${identity}-${index}`,
          label: datum.label ?? humanizeActivityId(datum.activityId),
          completedSeconds: Math.max(
            0,
            Number.isFinite(secondsCandidate) ? secondsCandidate : 0,
          ),
          color: datum.color ?? colorForActivity(datum.activityId, index),
        };
      }),
    [data],
  );

  const totalSeconds = activities.reduce(
    (sum, activity) => sum + activity.completedSeconds,
    0,
  );
  const radius = Math.max(20, (size - strokeWidth - 8) / 2);
  const circumference = 2 * Math.PI * radius;
  const gapLength = Math.min(
    4,
    circumference / Math.max(activities.length, 1) / 5,
  );
  const center = size / 2;
  const topActivity = activities.reduce<NormalizedActivity | undefined>(
    (top, activity) =>
      !top || activity.completedSeconds > top.completedSeconds ? activity : top,
    undefined,
  );

  const segments = activities.reduce<ActivitySegment[]>(
    (builtSegments, activity) => {
      const rawLength =
        totalSeconds > 0
          ? (activity.completedSeconds / totalSeconds) * circumference
          : 0;
      const previous = builtSegments[builtSegments.length - 1];
      const offset = previous ? previous.offset + previous.rawLength : 0;
      return [
        ...builtSegments,
        {
          ...activity,
          dashLength: Math.max(0, rawLength - gapLength),
          offset,
          percentage:
            totalSeconds > 0
              ? (activity.completedSeconds / totalSeconds) * 100
              : 0,
          rawLength,
        },
      ];
    },
    [],
  );

  const accessibilitySummary =
    totalSeconds <= 0
      ? "Activity breakdown chart. No completed activity time yet."
      : `Activity breakdown chart. ${formatMinutes(totalSeconds)} total minutes. ${topActivity?.label ?? "No activity"} has the most completed time.`;

  return (
    <ChartFrame
      accessibilityLabel={accessibilitySummary}
      dark={dark}
      interactive={Boolean(onSelect) && totalSeconds > 0}
      metric={
        totalSeconds > 0 ? `${formatMinutes(totalSeconds)} min` : "No time yet"
      }
      style={style}
      subtitle={subtitle}
      title={title}
    >
      {activities.length === 0 || totalSeconds <= 0 ? (
        <EmptyChartState
          dark={dark}
          message="Completed minutes will reveal your routine balance here."
        />
      ) : (
        <View style={styles.content}>
          <View style={[styles.donut, { height: size, width: size }]}>
            <Svg height={size} width={size}>
              <G rotation="-90" origin={`${center}, ${center}`}>
                <Circle
                  cx={center}
                  cy={center}
                  fill="none"
                  r={radius}
                  stroke={chart.track}
                  strokeWidth={strokeWidth}
                />
                {segments.map((segment) => {
                  const selected = selectedId === segment.identity;
                  const hasSelection = selectedId !== undefined;
                  return segment.dashLength > 0 ? (
                    <Circle
                      cx={center}
                      cy={center}
                      fill="none"
                      key={segment.key}
                      {...(onSelect
                        ? {
                            onPress: () =>
                              onSelect(segment.datum, segment.index),
                          }
                        : {})}
                      r={radius}
                      stroke={segment.color}
                      strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                      strokeDashoffset={-segment.offset}
                      strokeLinecap="round"
                      strokeOpacity={hasSelection && !selected ? 0.46 : 1}
                      strokeWidth={selected ? strokeWidth + 5 : strokeWidth}
                    />
                  ) : null;
                })}
              </G>
              <SvgText
                fill={colors.text}
                fontSize={30}
                fontWeight="700"
                textAnchor="middle"
                x={center}
                y={center + 2}
              >
                {formatMinutes(totalSeconds)}
              </SvgText>
              <SvgText
                fill={colors.textMuted}
                fontSize={10.5}
                fontWeight="600"
                letterSpacing={0.8}
                textAnchor="middle"
                x={center}
                y={center + 22}
              >
                MINUTES
              </SvgText>
            </Svg>
          </View>

          <View style={styles.legend}>
            {segments.map((segment) => {
              const selected = selectedId === segment.identity;
              const legendContent = (
                <>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: segment.color,
                        borderColor: selected ? colors.accent : "transparent",
                      },
                    ]}
                  />
                  <View style={styles.legendCopy}>
                    <Text
                      maxFontSizeMultiplier={1.35}
                      numberOfLines={1}
                      style={[
                        styles.legendLabel,
                        { color: selected ? colors.text : colors.textMuted },
                      ]}
                    >
                      {segment.label}
                    </Text>
                    <Text
                      maxFontSizeMultiplier={1.25}
                      style={[styles.legendValue, { color: colors.text }]}
                    >
                      {formatMinutes(segment.completedSeconds)}m ·{" "}
                      {Math.round(segment.percentage)}%
                    </Text>
                  </View>
                </>
              );

              return onSelect ? (
                <Pressable
                  accessibilityHint="Highlights this activity in the chart"
                  accessibilityLabel={`${segment.label}, ${formatMinutes(segment.completedSeconds)} minutes, ${Math.round(segment.percentage)} percent`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={segment.key}
                  onPress={() => onSelect(segment.datum, segment.index)}
                  style={({ pressed }) => [
                    styles.legendItem,
                    {
                      backgroundColor: selected
                        ? colors.surfaceMuted
                        : "transparent",
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}
                >
                  {legendContent}
                </Pressable>
              ) : (
                <View key={segment.key} style={styles.legendItem}>
                  {legendContent}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.lg,
  },
  donut: {
    alignItems: "center",
    justifyContent: "center",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    width: "100%",
  },
  legendItem: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexBasis: "48%",
    flexDirection: "row",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 48,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
  },
  legendDot: {
    borderRadius: radii.pill,
    borderWidth: 2,
    height: 10,
    width: 10,
  },
  legendCopy: {
    flex: 1,
  },
  legendLabel: {
    ...typography.caption,
    fontSize: 12,
    includeFontPadding: false,
  },
  legendValue: {
    ...typography.caption,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
});

export default ActivityBreakdownChart;
