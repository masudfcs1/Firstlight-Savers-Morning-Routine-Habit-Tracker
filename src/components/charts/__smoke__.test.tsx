import React from "react";
import { render } from "@testing-library/react-native";

import {
  ActivityBreakdownChart,
  ConsistencyHeatmap,
  MonthlyProgressChart,
  WeeklyConsistencyChart,
} from "./index";

describe("chart component smoke tests", () => {
  it("renders weekly analytics with absent-day semantics", () => {
    render(
      <WeeklyConsistencyChart
        data={[
          { dateKey: "2026-10-09", completionPercentage: 0, recorded: true },
          {
            dateKey: "2026-10-10",
            completionPercentage: null,
            recorded: false,
          },
        ]}
      />,
    );
  });

  it("renders monthly analytics", () => {
    render(
      <MonthlyProgressChart
        data={[{ key: "2026-10", completedRoutineDays: 4, calendarDays: 31 }]}
      />,
    );
  });

  it("renders the activity breakdown", () => {
    render(
      <ActivityBreakdownChart
        data={[{ activityId: "SILENCE", completedSeconds: 900 }]}
      />,
    );
  });

  it("renders a consistency heatmap", () => {
    render(
      <ConsistencyHeatmap
        data={[
          {
            dateKey: "2026-10-10",
            recorded: true,
            completionPercentage: 80,
            intensity: 3,
          },
        ]}
      />,
    );
  });
});
