import {
  makeAttendanceStats,
  makeAttendanceTotals,
} from "../../../src/tests/factories";
import {
  pick,
  shouldShowHeadline,
  stubAttendance,
  visitStats,
} from "../../support/routes/stats";

describe("Stats comparison lines", () => {
  it("compares a period with the previous one", () => {
    stubAttendance(
      makeAttendanceStats({
        comparison_kind: "PREVIOUS_PERIOD",
        comparison: makeAttendanceTotals({ attended: 381, no_show_rate: 0.15 }),
      }),
    );
    visitStats();
    shouldShowHeadline("attended", {
      value: "412",
      comparison: "+8% compared with the previous period",
    });
    shouldShowHeadline("no-show-rate", {
      value: "18%",
      comparison: "+3 points compared with the previous period",
    });
  });

  it("compares one event with every event of the picked period, naming it", () => {
    stubAttendance(
      makeAttendanceStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeAttendanceTotals(),
      }),
    );
    visitStats("/stats?meetup=m-march");
    shouldShowHeadline("attended", {
      comparison: "Across all events in the last 3 months: 82.4",
    });
    pick("stats-period", "stats-period-ytd");
    pick("stats-event", "stats-event-m-march");
    shouldShowHeadline("attended", {
      comparison: "Across all events this year: 82.4",
    });
  });

  it("names the days of a custom period", () => {
    stubAttendance(
      makeAttendanceStats({
        comparison_kind: "PERIOD_AVERAGE",
        comparison: makeAttendanceTotals(),
      }),
    );
    visitStats(
      "/stats?range=custom&from=2026-03-01&to=2026-03-31&meetup=m-march",
    );
    shouldShowHeadline("attended", {
      comparison: "Across all events from 01/03/2026 to 31/03/2026: 82.4",
    });
  });
});
