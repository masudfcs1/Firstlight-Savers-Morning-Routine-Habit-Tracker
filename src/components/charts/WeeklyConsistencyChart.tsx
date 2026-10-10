import React, { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { palette, spacing } from "../../theme";
import { ChartFrame, EmptyChartState, clamp, useChartTheme } from "./_shared";

export type WeeklyConsistencyDatum = {
  id?: string | undefined;
  dateKey?: string | undefined;
  label?: string | undefined;
  completionPercentage: number | null;
  /** False means no routine record exists. A recorded 0% day should leave this true. */
  hasRecord?: boolean | undefined;
  /** Alias used by the analytics layer. */
  recorded?: boolean | undefined;
};

export type WeeklyConsistencyChartProps = {
  data: readonly WeeklyConsistencyDatum[];
  title?: string | undefined;
  subtitle?: string | undefined;
  dark?: boolean | undefined;
  height?: number | undefined;
  width?: number | undefined;
  selectedId?: string | undefined;
  onSelect?:
    ((datum: WeeklyConsistencyDatum, index: number) => void) | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

type NormalizedPoint = {
  datum: WeeklyConsistencyDatum;
  index: number;
  identity: string;
  key: string;
  label: string;
  value: number;
  hasRecord: boolean;
};

const Y_TICKS = [100, 75, 50, 25, 0] as const;
const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

function labelForDatum(datum: WeeklyConsistencyDatum, index: number): string {
  if (datum.label) return datum.label;
  if (datum.dateKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum.dateKey);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const weekday =
        WEEKDAY_LABELS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
      if (weekday) return weekday;
    }
  }
  return String(index + 1);
}

export function WeeklyConsistencyChart({
  data,
  title = "Weekly consistency",
  subtitle = "Daily routine completion",
  dark,
  height = 190,
  width,
  selectedId,
  onSelect,
  style,
}: WeeklyConsistencyChartProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const { colors, chart } = useChartTheme(dark);

  const points = useMemo<NormalizedPoint[]>(
    () =>
      data.map((datum, index) => {
        const identity = datum.id ?? datum.dateKey ?? String(index);
        return {
          datum,
          index,
          identity,
          key: `${identity}-${index}`,
          label: labelForDatum(datum, index),
          value: clamp(datum.completionPercentage ?? 0, 0, 100),
          hasRecord:
            datum.hasRecord ??
            datum.recorded ??
            datum.completionPercentage !== null,
        };
      }),
    [data],
  );

  const recordedPoints = points.filter((point) => point.hasRecord);
  const average =
    recordedPoints.length > 0
      ? recordedPoints.reduce((sum, point) => sum + point.value, 0) /
        recordedPoints.length
      : 0;
  const completedDays = recordedPoints.filter(
    (point) => point.value >= 100,
  ).length;
  const chartWidth = Math.max(
    220,
    measuredWidth ||
      (width ? width - spacing.lg * 2 : Math.min(windowWidth - 80, 620)),
  );
  const left = 30;
  const right = 8;
  const top = 12;
  const bottom = 30;
  const plotWidth = Math.max(120, chartWidth - left - right);
  const plotHeight = Math.max(80, height - top - bottom);
  const columnWidth = plotWidth / Math.max(points.length, 1);
  const barWidth = clamp(columnWidth * 0.38, 12, 28);

  const linePath = useMemo(() => {
    let path = "";
    let segmentOpen = false;
    points.forEach((point, index) => {
      if (!point.hasRecord) {
        segmentOpen = false;
        return;
      }
      const x = left + columnWidth * index + columnWidth / 2;
      const y = top + plotHeight * (1 - point.value / 100);
      path += `${segmentOpen ? " L" : " M"} ${x} ${y}`;
      segmentOpen = true;
    });
    return path;
  }, [columnWidth, plotHeight, points]);

  const accessibilitySummary =
    points.length === 0
      ? "Weekly consistency chart. No routine history yet."
      : `Weekly consistency chart. ${Math.round(average)} percent average. ${completedDays} fully completed ${completedDays === 1 ? "day" : "days"}.`;

  return (
    <ChartFrame
      accessibilityLabel={accessibilitySummary}
      dark={dark}
      interactive={Boolean(onSelect)}
      metric={
        recordedPoints.length > 0 ? `${Math.round(average)}% avg` : "No data"
      }
      style={[width ? { width } : undefined, style]}
      subtitle={subtitle}
      title={title}
    >
      {points.length === 0 ? (
        <EmptyChartState
          dark={dark}
          message="Complete a morning to begin your weekly rhythm."
        />
      ) : (
        <View
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (nextWidth > 0 && Math.abs(nextWidth - measuredWidth) > 0.5) {
              setMeasuredWidth(nextWidth);
            }
          }}
          style={[styles.chart, { height }]}
        >
          <Svg height={height} width={chartWidth}>
            <Defs>
              <LinearGradient id="weeklyAmber" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity={1} />
                <Stop
                  offset="1"
                  stopColor={palette.amberDark}
                  stopOpacity={0.76}
                />
              </LinearGradient>
            </Defs>

            {Y_TICKS.map((tick) => {
              const y = top + plotHeight * (1 - tick / 100);
              return (
                <React.Fragment key={tick}>
                  <Line
                    stroke={chart.grid}
                    {...(tick === 0 ? {} : { strokeDasharray: "3 5" })}
                    strokeWidth={1}
                    x1={left}
                    x2={left + plotWidth}
                    y1={y}
                    y2={y}
                  />
                  {(tick === 100 || tick === 50 || tick === 0) && (
                    <SvgText
                      fill={colors.textSubtle}
                      fontSize={9.5}
                      textAnchor="end"
                      x={left - 7}
                      y={y + 3.5}
                    >
                      {tick}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}

            {linePath ? (
              <Path
                d={linePath}
                fill="none"
                stroke={colors.accent}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={0.42}
                strokeWidth={2}
              />
            ) : null}

            {points.map((point, index) => {
              const centerX = left + columnWidth * index + columnWidth / 2;
              const selected = selectedId === point.identity;
              const valueY = top + plotHeight * (1 - point.value / 100);
              const fillHeight = Math.max(
                point.value > 0 ? 4 : 0,
                top + plotHeight - valueY,
              );

              return (
                <React.Fragment key={point.key}>
                  <Rect
                    fill={point.hasRecord ? chart.track : "transparent"}
                    height={plotHeight}
                    rx={barWidth / 2}
                    stroke={point.hasRecord ? "transparent" : chart.noRecord}
                    {...(point.hasRecord ? {} : { strokeDasharray: "2 4" })}
                    strokeWidth={1}
                    width={barWidth}
                    x={centerX - barWidth / 2}
                    y={top}
                  />
                  {point.hasRecord && fillHeight > 0 ? (
                    <Rect
                      fill="url(#weeklyAmber)"
                      height={fillHeight}
                      rx={barWidth / 2}
                      width={barWidth}
                      x={centerX - barWidth / 2}
                      y={top + plotHeight - fillHeight}
                    />
                  ) : null}
                  {point.hasRecord ? (
                    <Circle
                      cx={centerX}
                      cy={valueY}
                      fill={colors.surface}
                      r={selected ? 5.5 : 4}
                      stroke={colors.accent}
                      strokeWidth={selected ? 3 : 2}
                    />
                  ) : (
                    <Line
                      stroke={chart.noRecord}
                      strokeLinecap="round"
                      strokeWidth={2}
                      x1={centerX - 4}
                      x2={centerX + 4}
                      y1={top + plotHeight - 4}
                      y2={top + plotHeight - 4}
                    />
                  )}
                  {selected && point.hasRecord ? (
                    <React.Fragment>
                      <Rect
                        fill={chart.tooltip}
                        height={22}
                        rx={11}
                        width={40}
                        x={centerX - 20}
                        y={Math.max(0, valueY - 31)}
                      />
                      <SvgText
                        fill={chart.tooltipText}
                        fontSize={10}
                        fontWeight="700"
                        textAnchor="middle"
                        x={centerX}
                        y={Math.max(14, valueY - 16)}
                      >
                        {Math.round(point.value)}%
                      </SvgText>
                    </React.Fragment>
                  ) : null}
                  <SvgText
                    fill={selected ? colors.text : colors.textMuted}
                    fontSize={10.5}
                    fontWeight={selected ? "700" : "500"}
                    textAnchor="middle"
                    x={centerX}
                    y={height - 8}
                  >
                    {point.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {onSelect
            ? points.map((point, index) => (
                <Pressable
                  accessibilityHint="Shows this day's completion value"
                  accessibilityLabel={`${point.label}, ${point.hasRecord ? `${Math.round(point.value)} percent complete` : "no routine recorded"}`}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: selectedId === point.identity,
                  }}
                  key={`touch-${point.key}`}
                  onPress={() => onSelect(point.datum, point.index)}
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
      )}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  chart: {
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  touchColumn: {
    position: "absolute",
    top: 0,
  },
});

export default WeeklyConsistencyChart;
