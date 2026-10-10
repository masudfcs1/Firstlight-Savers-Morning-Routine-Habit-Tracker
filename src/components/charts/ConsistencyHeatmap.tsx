import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { palette, radii, spacing, typography } from "../../theme";
import { ChartFrame, EmptyChartState, clamp, useChartTheme } from "./_shared";

export type HeatmapIntensity = 0 | 1 | 2 | 3 | 4;

export type ConsistencyHeatmapDatum = {
  dateKey: string;
  /** False distinguishes an absent routine record from a recorded zero-percent day. */
  recorded?: boolean | undefined;
  completionPercentage: number | null;
  intensity?: HeatmapIntensity | null | undefined;
};

export type ConsistencyHeatmapProps = {
  data: readonly ConsistencyHeatmapDatum[];
  title?: string | undefined;
  subtitle?: string | undefined;
  dark?: boolean | undefined;
  weeks?: number | undefined;
  startDateKey?: string | undefined;
  endDateKey?: string | undefined;
  weekStartsOn?: 0 | 1 | undefined;
  cellSize?: number | undefined;
  gap?: number | undefined;
  locale?: string | undefined;
  selectedDateKey?: string | undefined;
  onSelect?:
    | ((dateKey: string, datum: ConsistencyHeatmapDatum | undefined) => void)
    | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

const DAY_MS = 86_400_000;
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTH_LABELS = [
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

function parseDateKey(dateKey: string | undefined): number | undefined {
  if (!dateKey) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const parsed = new Date(time);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return undefined;
  }
  return time;
}

function dateKeyFromTime(time: number): string {
  const date = new Date(time);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function startOfWeek(time: number, weekStartsOn: 0 | 1): number {
  const day = new Date(time).getUTCDay();
  const daysSinceStart = (day - weekStartsOn + 7) % 7;
  return time - daysSinceStart * DAY_MS;
}

function endOfWeek(time: number, weekStartsOn: 0 | 1): number {
  return startOfWeek(time, weekStartsOn) + 6 * DAY_MS;
}

function currentLocalDateAsUtc(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function intensityFor(
  datum: ConsistencyHeatmapDatum | undefined,
): HeatmapIntensity | null {
  const recorded = datum?.recorded ?? datum?.completionPercentage !== null;
  if (!datum || !recorded) return null;
  if (datum.intensity !== undefined && datum.intensity !== null)
    return datum.intensity;
  const percentage = clamp(datum.completionPercentage ?? 0, 0, 100);
  if (percentage <= 0) return 0;
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage < 100) return 3;
  return 4;
}

function formatDate(time: number, locale: string | undefined): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(new Date(time));
  } catch {
    return dateKeyFromTime(time);
  }
}

export function ConsistencyHeatmap({
  data,
  title = "Consistency calendar",
  subtitle = "Every morning adds to the pattern",
  dark,
  weeks = 12,
  startDateKey,
  endDateKey,
  weekStartsOn = 1,
  cellSize,
  gap = 4,
  locale,
  selectedDateKey,
  onSelect,
  style,
}: ConsistencyHeatmapProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const { colors, isDark, chart } = useChartTheme(dark);

  const datumByDate = useMemo(() => {
    const map = new Map<string, ConsistencyHeatmapDatum>();
    data.forEach((datum) => {
      if (parseDateKey(datum.dateKey) !== undefined)
        map.set(datum.dateKey, datum);
    });
    return map;
  }, [data]);

  const validTimes = useMemo(
    () =>
      [...datumByDate.keys()]
        .map((dateKey) => parseDateKey(dateKey))
        .filter((time): time is number => time !== undefined),
    [datumByDate],
  );
  const requestedStart = parseDateKey(startDateKey);
  const latestDataTime =
    validTimes.length > 0 ? Math.max(...validTimes) : undefined;
  const requestedEnd =
    parseDateKey(endDateKey) ?? latestDataTime ?? currentLocalDateAsUtc();
  const rangeEnd =
    requestedStart !== undefined
      ? Math.max(requestedStart, requestedEnd)
      : requestedEnd;
  const alignedEnd = endOfWeek(rangeEnd, weekStartsOn);
  const requestedWeekCount = Math.round(clamp(weeks, 1, 53));
  const gridStart =
    requestedStart !== undefined
      ? startOfWeek(requestedStart, weekStartsOn)
      : alignedEnd - (requestedWeekCount * 7 - 1) * DAY_MS;
  const columnCount = Math.max(
    1,
    Math.ceil((alignedEnd - gridStart + DAY_MS) / (7 * DAY_MS)),
  );
  const visibleStart = requestedStart ?? gridStart;
  const safeGap = clamp(gap, 1, 8);
  const fallbackWidth = Math.min(windowWidth - 80, 620);
  const viewportWidth = Math.max(220, measuredWidth || fallbackWidth);
  const dayLabelWidth = 20;
  const availableGridWidth = Math.max(160, viewportWidth - dayLabelWidth);
  const resolvedCellSize =
    cellSize !== undefined
      ? clamp(cellSize, 8, 24)
      : clamp(
          Math.floor(
            (availableGridWidth - safeGap * (columnCount - 1)) / columnCount,
          ),
          10,
          15,
        );
  const stride = resolvedCellSize + safeGap;
  const gridWidth = columnCount * stride - safeGap;

  const intensityColors = isDark
    ? ["#29473F", "#3A5D53", "#557A6E", "#7FA394", colors.accent]
    : ["#EEEAE1", "#DDE6D8", palette.sage, palette.sageDark, palette.forest];

  const columns = useMemo(
    () =>
      Array.from({ length: columnCount }, (_, columnIndex) =>
        Array.from({ length: 7 }, (_, rowIndex) => {
          const time = gridStart + (columnIndex * 7 + rowIndex) * DAY_MS;
          const dateKey = dateKeyFromTime(time);
          return {
            columnIndex,
            rowIndex,
            time,
            dateKey,
            datum: datumByDate.get(dateKey),
            inRange: time >= visibleStart && time <= rangeEnd,
          };
        }),
      ),
    [columnCount, datumByDate, gridStart, rangeEnd, visibleStart],
  );

  const monthMarkers = useMemo(() => {
    let previousMonth = -1;
    return columns.flatMap((column, columnIndex) => {
      const firstInRange = column.find((cell) => cell.inRange);
      if (!firstInRange) return [];
      const month = new Date(firstInRange.time).getUTCMonth();
      if (month === previousMonth) return [];
      previousMonth = month;
      return [{ columnIndex, label: MONTH_LABELS[month] ?? "" }];
    });
  }, [columns]);

  const visibleCells = columns.flat().filter((cell) => cell.inRange);
  const recordedCells = visibleCells.filter(
    (cell) => intensityFor(cell.datum) !== null,
  );
  const average =
    recordedCells.length > 0
      ? recordedCells.reduce(
          (sum, cell) =>
            sum + clamp(cell.datum?.completionPercentage ?? 0, 0, 100),
          0,
        ) / recordedCells.length
      : 0;
  const selectedTime = parseDateKey(selectedDateKey);
  const selectedDatum = selectedDateKey
    ? datumByDate.get(selectedDateKey)
    : undefined;
  const selectedRecorded = intensityFor(selectedDatum) !== null;

  const accessibilitySummary =
    datumByDate.size === 0
      ? "Consistency calendar. No routine history yet."
      : `Consistency calendar. ${recordedCells.length} recorded ${recordedCells.length === 1 ? "day" : "days"}, averaging ${Math.round(average)} percent completion.`;

  return (
    <ChartFrame
      accessibilityLabel={accessibilitySummary}
      dark={dark}
      interactive={Boolean(onSelect)}
      metric={
        recordedCells.length > 0
          ? `${recordedCells.length} active`
          : "No activity"
      }
      style={style}
      subtitle={subtitle}
      title={title}
    >
      {datumByDate.size === 0 ? (
        <EmptyChartState
          dark={dark}
          message="Your consistency pattern will appear after your first recorded morning."
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
          <View style={styles.heatmapRow}>
            <View
              style={[
                styles.dayLabels,
                { marginTop: 22, width: dayLabelWidth },
              ]}
            >
              {Array.from({ length: 7 }, (_, rowIndex) => {
                const dayIndex = (weekStartsOn + rowIndex) % 7;
                return (
                  <View
                    key={`${dayIndex}-${rowIndex}`}
                    style={{
                      height: resolvedCellSize,
                      justifyContent: "center",
                      marginBottom: rowIndex === 6 ? 0 : safeGap,
                    }}
                  >
                    <Text
                      style={[styles.dayLabel, { color: colors.textSubtle }]}
                    >
                      {rowIndex % 2 === 0 ? DAY_LABELS[dayIndex] : ""}
                    </Text>
                  </View>
                );
              })}
            </View>

            <ScrollView
              bounces={false}
              contentContainerStyle={styles.scrollContent}
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.scroller}
            >
              <View style={{ width: gridWidth }}>
                <View style={[styles.monthLabels, { width: gridWidth }]}>
                  {monthMarkers.map((marker) => (
                    <Text
                      key={`${marker.label}-${marker.columnIndex}`}
                      maxFontSizeMultiplier={1.2}
                      style={[
                        styles.monthLabel,
                        {
                          color: colors.textMuted,
                          left: marker.columnIndex * stride,
                        },
                      ]}
                    >
                      {marker.label}
                    </Text>
                  ))}
                </View>

                <View style={styles.columns}>
                  {columns.map((column, columnIndex) => (
                    <View
                      key={`column-${columnIndex}`}
                      style={{
                        marginRight:
                          columnIndex === columnCount - 1 ? 0 : safeGap,
                      }}
                    >
                      {column.map((cell) => {
                        const intensity = intensityFor(cell.datum);
                        const selected = selectedDateKey === cell.dateKey;
                        const fillColor =
                          intensity === null
                            ? "transparent"
                            : (intensityColors[intensity] ??
                              intensityColors[0] ??
                              chart.track);
                        const label = `${formatDate(cell.time, locale)}, ${
                          intensity === null
                            ? "no routine recorded"
                            : `${Math.round(clamp(cell.datum?.completionPercentage ?? 0, 0, 100))} percent complete`
                        }`;
                        const cellStyle = [
                          styles.cell,
                          {
                            backgroundColor: fillColor,
                            borderColor: selected
                              ? colors.accent
                              : intensity === null
                                ? chart.noRecord
                                : "transparent",
                            borderWidth: selected
                              ? 2
                              : intensity === null
                                ? StyleSheet.hairlineWidth
                                : 0,
                            height: resolvedCellSize,
                            marginBottom: cell.rowIndex === 6 ? 0 : safeGap,
                            opacity: cell.inRange ? 1 : 0,
                            width: resolvedCellSize,
                          },
                        ];

                        if (!cell.inRange) {
                          return (
                            <View
                              key={cell.dateKey}
                              pointerEvents="none"
                              style={cellStyle}
                            />
                          );
                        }

                        return onSelect ? (
                          <Pressable
                            accessibilityHint="Opens this day's routine details"
                            accessibilityLabel={label}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            key={cell.dateKey}
                            onPress={() => onSelect(cell.dateKey, cell.datum)}
                            style={({ pressed }) => [
                              cellStyle,
                              pressed && styles.pressedCell,
                            ]}
                          />
                        ) : (
                          <View key={cell.dateKey} style={cellStyle} />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendGroup}>
              <View
                style={[
                  styles.legendCell,
                  {
                    borderColor: chart.noRecord,
                    height: 10,
                    width: 10,
                  },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textSubtle }]}>
                No record
              </Text>
            </View>
            <View style={styles.legendGroup}>
              <Text style={[styles.legendText, { color: colors.textSubtle }]}>
                Less
              </Text>
              {intensityColors.map((color, index) => (
                <View
                  key={`${color}-${index}`}
                  style={[styles.legendCell, { backgroundColor: color }]}
                />
              ))}
              <Text style={[styles.legendText, { color: colors.textSubtle }]}>
                More
              </Text>
            </View>
          </View>

          {selectedDateKey && selectedTime !== undefined ? (
            <View
              accessible
              accessibilityLabel={`${formatDate(selectedTime, locale)}, ${
                selectedRecorded
                  ? `${Math.round(clamp(selectedDatum?.completionPercentage ?? 0, 0, 100))} percent complete`
                  : "no routine recorded"
              }`}
              style={[
                styles.selection,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.selectionDate, { color: colors.text }]}
              >
                {formatDate(selectedTime, locale)}
              </Text>
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.selectionValue,
                  {
                    color: selectedRecorded ? colors.success : colors.textMuted,
                  },
                ]}
              >
                {selectedRecorded
                  ? `${Math.round(clamp(selectedDatum?.completionPercentage ?? 0, 0, 100))}% complete`
                  : "No routine recorded"}
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </ChartFrame>
  );
}

const styles = StyleSheet.create({
  viewport: {
    width: "100%",
  },
  heatmapRow: {
    flexDirection: "row",
    width: "100%",
  },
  dayLabels: {
    flexShrink: 0,
  },
  dayLabel: {
    ...typography.caption,
    fontSize: 9,
    includeFontPadding: false,
  },
  scroller: {
    flex: 1,
  },
  scrollContent: {
    paddingRight: 1,
  },
  monthLabels: {
    height: 22,
    position: "relative",
  },
  monthLabel: {
    ...typography.caption,
    fontSize: 9.5,
    includeFontPadding: false,
    position: "absolute",
    top: 0,
  },
  columns: {
    flexDirection: "row",
  },
  cell: {
    borderRadius: 3,
  },
  pressedCell: {
    opacity: 0.62,
    transform: [{ scale: 0.9 }],
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  legendGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  legendCell: {
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    height: 9,
    width: 9,
  },
  legendText: {
    ...typography.caption,
    fontSize: 10,
    includeFontPadding: false,
  },
  selection: {
    alignItems: "center",
    borderRadius: radii.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  selectionDate: {
    ...typography.caption,
    includeFontPadding: false,
  },
  selectionValue: {
    ...typography.caption,
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
});

export default ConsistencyHeatmap;
