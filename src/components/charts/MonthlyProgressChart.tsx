import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { palette, spacing } from "../../theme";
import {
  ChartFrame,
  EmptyChartState,
  clamp,
  formatCompactNumber,
  useChartTheme,
} from "./_shared";

export type MonthlyProgressDatum = {
  id?: string | undefined;
  key?: string | undefined;
  label?: string | undefined;
  year?: number | undefined;
  month?: number | undefined;
  completedRoutines?: number | undefined;
  /** Alias used by the analytics layer. */
  completedRoutineDays?: number | undefined;
  totalRoutines?: number | undefined;
  /** Alias used by the analytics layer. */
  calendarDays?: number | undefined;
  recordedDays?: number | undefined;
  hasRecord?: boolean | undefined;
  completionRate?: number | undefined;
};

export type MonthlyProgressChartProps = {
  data: readonly MonthlyProgressDatum[];
  title?: string | undefined;
  subtitle?: string | undefined;
  dark?: boolean | undefined;
  height?: number | undefined;
  width?: number | undefined;
  selectedId?: string | undefined;
  onSelect?: ((datum: MonthlyProgressDatum, index: number) => void) | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

type NormalizedMonth = {
  datum: MonthlyProgressDatum;
  index: number;
  identity: string;
  key: string;
  label: string;
  completed: number;
  total: number;
  hasRecord: boolean;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function monthLabel(datum: MonthlyProgressDatum, index: number): string {
  if (datum.label) return datum.label;
  if (datum.month && datum.month >= 1 && datum.month <= 12) {
    return MONTHS[datum.month - 1] ?? String(datum.month);
  }
  const keyMatch = /^(\d{4})-(\d{2})/.exec(datum.key ?? "");
  if (keyMatch) {
    const month = Number(keyMatch[2]);
    return MONTHS[month - 1] ?? keyMatch[2] ?? String(index + 1);
  }
  return String(index + 1);
}

function niceMaximum(value: number): number {
  if (value <= 5) return Math.max(1, Math.ceil(value));
  if (value <= 20) return Math.ceil(value / 5) * 5;
  if (value <= 50) return Math.ceil(value / 10) * 10;
  return Math.ceil(value / 25) * 25;
}

export function MonthlyProgressChart({
  data,
  title = "Monthly progress",
  subtitle = "Fully completed morning routines",
  dark,
  height = 206,
  width,
  selectedId,
  onSelect,
  style,
}: MonthlyProgressChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const { colors, isDark, chart } = useChartTheme(dark);

  const months = useMemo<NormalizedMonth[]>(
    () =>
      data.map((datum, index) => {
        const completedCandidate =
          datum.completedRoutines ?? datum.completedRoutineDays ?? 0;
        const completed = Math.max(
          0,
          Number.isFinite(completedCandidate) ? completedCandidate : 0,
        );
        const totalCandidate =
          datum.totalRoutines ?? datum.calendarDays ?? completed;
        const total = Math.max(
          completed,
          Number.isFinite(totalCandidate) ? totalCandidate : completed,
        );
        const identity =
          datum.id ??
          datum.key ??
          (datum.year && datum.month
            ? `${datum.year}-${String(datum.month).padStart(2, "0")}`
            : String(index));

        return {
          datum,
          index,
          identity,
          key: `${identity}-${index}`,
          label: monthLabel(datum, index),
          completed,
          total,
          hasRecord:
            datum.hasRecord ??
            (datum.recordedDays === undefined || datum.recordedDays > 0),
        };
      }),
    [data],
  );

  const totalCompleted = months.reduce(
    (sum, month) => sum + month.completed,
    0,
  );
  const maximum = niceMaximum(
    months.reduce(
      (highest, month) => Math.max(highest, month.total, month.completed),
      0,
    ),
  );
  const fallbackWidth = width
    ? width - spacing.lg * 2
    : Math.min(windowWidth - 80, 620);
  const viewportWidth = Math.max(220, measuredWidth || fallbackWidth);
  const left = 30;
  const right = 8;
  const top = 20;
  const bottom = 30;
  const minimumColumnWidth = months.length <= 6 ? 54 : 44;
  const svgWidth = Math.max(
    viewportWidth,
    left + right + months.length * minimumColumnWidth,
  );
  const plotWidth = Math.max(120, svgWidth - left - right);
  const plotHeight = Math.max(88, height - top - bottom);
  const columnWidth = plotWidth / Math.max(months.length, 1);
  const barWidth = clamp(columnWidth * 0.5, 16, 34);
  const tickValues = [maximum, maximum / 2, 0];

  const accessibilitySummary =
    months.length === 0
      ? "Monthly progress chart. No monthly history yet."
      : `Monthly progress chart. ${formatCompactNumber(totalCompleted)} completed routines across ${months.length} ${months.length === 1 ? "month" : "months"}.`;

  return (
    <ChartFrame
      accessibilityLabel={accessibilitySummary}
      dark={dark}
      interactive={Boolean(onSelect)}
      metric={`${formatCompactNumber(totalCompleted)} complete`}
      style={[width ? { width } : undefined, style]}
      subtitle={subtitle}
      title={title}
    >
      {months.length === 0 ? (
        <EmptyChartState
          dark={dark}
          message="Your monthly story will take shape as routines are completed."
        />
      ) : (
        <View
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (nextWidth > 0 && Math.abs(nextWidth - measuredWidth) > 0.5) {
              setMeasuredWidth(nextWidth);
            }
          }}
          style={styles.viewport}
        >
          <ScrollView
            bounces={false}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
          >
            <View style={{ height, width: svgWidth }}>
              <Svg height={height} width={svgWidth}>
                <Defs>
                  <LinearGradient id="monthlySage" x1="0" x2="0" y1="0" y2="1">
                    <Stop
                      offset="0"
                      stopColor={colors.primary}
                      stopOpacity={0.96}
                    />
                    <Stop
                      offset="1"
                      stopColor={
                        isDark ? palette.sageDark : palette.forestLight
                      }
                      stopOpacity={0.82}
                    />
                  </LinearGradient>
                </Defs>

                {tickValues.map((tick, tickIndex) => {
                  const y = top + plotHeight * (1 - tick / maximum);
                  return (
                    <React.Fragment key={`${tick}-${tickIndex}`}>
                      <Line
                        stroke={chart.grid}
                        {...(tickIndex === tickValues.length - 1
                          ? {}
                          : { strokeDasharray: "3 5" })}
                        strokeWidth={1}
                        x1={left}
                        x2={left + plotWidth}
                        y1={y}
                        y2={y}
                      />
                      <SvgText
                        fill={colors.textSubtle}
                        fontSize={9.5}
                        textAnchor="end"
                        x={left - 7}
                        y={y + 3.5}
                      >
                        {Math.round(tick)}
                      </SvgText>
                    </React.Fragment>
                  );
                })}

                {months.map((month, index) => {
                  const centerX = left + columnWidth * index + columnWidth / 2;
                  const selected = selectedId === month.identity;
                  const fillHeight = (month.completed / maximum) * plotHeight;
                  const targetHeight = (month.total / maximum) * plotHeight;
                  const targetY = top + plotHeight - targetHeight;
                  const valueY = top + plotHeight - fillHeight;

                  return (
                    <React.Fragment key={month.key}>
                      <Rect
                        fill={month.hasRecord ? chart.track : "transparent"}
                        height={Math.max(4, targetHeight)}
                        rx={barWidth / 2}
                        stroke={
                          month.hasRecord ? "transparent" : chart.noRecord
                        }
                        {...(month.hasRecord ? {} : { strokeDasharray: "2 4" })}
                        strokeWidth={1}
                        width={barWidth}
                        x={centerX - barWidth / 2}
                        y={targetY}
                      />
                      {month.hasRecord && fillHeight > 0 ? (
                        <Rect
                          fill="url(#monthlySage)"
                          height={Math.max(4, fillHeight)}
                          rx={barWidth / 2}
                          stroke={selected ? colors.accent : "transparent"}
                          strokeWidth={selected ? 2 : 0}
                          width={barWidth}
                          x={centerX - barWidth / 2}
                          y={valueY}
                        />
                      ) : null}
                      {month.hasRecord && month.completed > 0 ? (
                        <SvgText
                          fill={selected ? colors.accent : colors.textMuted}
                          fontSize={10}
                          fontWeight={selected ? "700" : "600"}
                          textAnchor="middle"
                          x={centerX}
                          y={Math.max(11, valueY - 7)}
                        >
                          {formatCompactNumber(month.completed)}
                        </SvgText>
                      ) : null}
                      <SvgText
                        fill={selected ? colors.text : colors.textMuted}
                        fontSize={10.5}
                        fontWeight={selected ? "700" : "500"}
                        textAnchor="middle"
                        x={centerX}
                        y={height - 8}
                      >
                        {month.label}
                      </SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>

              {onSelect
                ? months.map((month, index) => (
                    <Pressable
                      accessibilityHint="Shows this month's routine total"
                      accessibilityLabel={`${month.label}, ${month.hasRecord ? `${formatCompactNumber(month.completed)} completed routines` : "no routines recorded"}`}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: selectedId === month.identity,
                      }}
                      key={`touch-${month.key}`}
                      onPress={() => onSelect(month.datum, month.index)}
                      style={[
                        styles.touchColumn,
                        {
                          height,
                          left: left + columnWidth * index,
                          width: columnWidth,
                        },
                      ]}
                    />
                  ))
                : null}
            </View>
          </ScrollView>
        </View>
      )}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: "100%",
  },
  touchColumn: {
    position: "absolute",
    top: 0,
  },
});

export default MonthlyProgressChart;
