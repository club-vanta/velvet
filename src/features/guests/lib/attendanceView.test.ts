import { describe, expect, it } from "vitest";
import { translations } from "@/lib/i18n";
import { makeAttendanceSummary } from "@/tests/factories";
import { ATTENDANCE_VIEW, attendanceSummaryItems } from "./attendanceView";

describe("attendanceSummaryItems", () => {
  it("lists the totals in reading order, with walk-ins inside attended", () => {
    expect(
      attendanceSummaryItems(
        makeAttendanceSummary({
          attended: 2,
          walkin: 1,
          no_show: 1,
          cancelled: 1,
          upcoming: 1,
        }),
      ),
    ).toEqual([
      { status: "ATTENDED", count: 2, walkins: 1, danger: false },
      { status: "NO_SHOW", count: 1, walkins: 0, danger: true },
      { status: "CANCELLED", count: 1, walkins: 0, danger: false },
      { status: "UPCOMING", count: 1, walkins: 0, danger: false },
    ]);
  });

  it("hides the totals that are zero", () => {
    expect(
      attendanceSummaryItems(makeAttendanceSummary({ no_show: 3 })),
    ).toEqual([{ status: "NO_SHOW", count: 3, walkins: 0, danger: true }]);
  });
});

describe("ATTENDANCE_VIEW", () => {
  it("labels every status in English and Spanish", () => {
    const labels = Object.values(ATTENDANCE_VIEW).map((v) => v.label);
    expect(labels.map((key) => translations.es[key])).toEqual([
      "Fue",
      "Discreto",
      "No fue",
      "Se bajó",
      "Próximo",
    ]);
    for (const key of labels) expect(translations.en[key]).toBeTruthy();
  });
});
