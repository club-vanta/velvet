import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/i18n";
import { DemographicsTab } from "./DemographicsTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type Demographics = components["schemas"]["DemographicStatsPublic"];
type Summary = components["schemas"]["DemographicSummaryPublic"];
type GenderGroup = components["schemas"]["GenderGroupPublic"];
type AgeGroup = components["schemas"]["AgeGroupPublic"];

/** Matches GENDER and AGE: 120 attended, 12 of them with no known age. */
const SUMMARY: Summary = {
  attended: 120,
  median_age: 32.7,
  known_age_share: 0.9,
};

const NOBODY: Summary = {
  attended: 0,
  median_age: null,
  known_age_share: null,
};

const share = (part: number, total: number) =>
  total === 0 ? null : Math.round((part / total) * 10000) / 10000;

/**
 * A group as the API counts it: of `expected` people, `noShow` did not come
 * and the rest attended. `withShares` fills in its shares of the totals.
 */
function group<K extends GenderGroup["key"] | AgeGroup["key"]>(
  key: K,
  expected: number,
  noShow: number,
) {
  const g: Omit<GenderGroup, "key"> & { key: K } = {
    key,
    attended: expected - noShow,
    expected,
    no_show: noShow,
    no_show_rate: share(noShow, expected),
    attended_share: null,
    expected_share: null,
  };
  return g;
}

/** Each group's share of the attended and expected totals, null on a zero total. */
function withShares<G extends GenderGroup | AgeGroup>(groups: G[]): G[] {
  const attended = groups.reduce((sum, g) => sum + g.attended, 0);
  const expected = groups.reduce((sum, g) => sum + g.expected, 0);
  return groups.map((g) => ({
    ...g,
    attended_share: share(g.attended, attended),
    expected_share: share(g.expected, expected),
  }));
}

// Gender and age split the same RSVPs, so their totals agree.
const GENDER: GenderGroup[] = withShares([
  group("MALE", 100, 10),
  group("NEW_CODE", 4, 2),
  group(null, 32, 4),
]);

const AGE: AgeGroup[] = withShares([
  group("AGE_18_24", 40, 6),
  group("AGE_25_29", 35, 3),
  group("AGE_30_34", 22, 1),
  group("AGE_35_39", 12, 2),
  group("AGE_40_49", 8, 1),
  group("AGE_50_PLUS", 5, 1),
  group("UNKNOWN", 14, 2),
]);

/** Every age bucket with nothing in it: the API always sends all seven. */
const NO_AGES: AgeGroup[] = AGE.map((g) => group(g.key, 0, 0));

function stats(overrides: Partial<Demographics> = {}): Demographics {
  return {
    gender: GENDER,
    age: AGE,
    summary: SUMMARY,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

const PERIOD = { from: "2026-01-15", to: "2026-04-16" };

function renderTab(props: Partial<StatsTabProps> = {}) {
  const onShowAll = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <DemographicsTab
          orgId="org-1"
          query={PERIOD}
          onShowAll={onShowAll}
          {...props}
        />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { onShowAll };
}

const ok = (data: Demographics) => Promise.resolve({ data, error: undefined });
const respond = (result: unknown) =>
  mockApiGet.mockImplementation(() => result);

function headline(label: string): HTMLElement {
  const card = Array.from(
    document.querySelectorAll<HTMLElement>("[data-headline]"),
  ).find(
    (el) => el.querySelector('[data-slot="label"]')?.textContent === label,
  );
  if (!card) throw new Error(`No headline ${label}`);
  return card;
}

function slot(label: string, name: string): string | null {
  return (
    headline(label).querySelector(`[data-slot="${name}"]`)?.textContent ?? null
  );
}

function groupRow(label: string): HTMLElement {
  const row = Array.from(
    document.querySelectorAll<HTMLElement>('[data-slot="group-row"]'),
  ).find(
    (el) => el.querySelector('[data-slot="group"]')?.textContent === label,
  );
  if (!row) throw new Error(`No group row ${label}`);
  return row;
}

const part = (row: HTMLElement, name: string) =>
  row.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/demographics",
  );

const headlinesReady = () => waitFor(() => headline("Edad mediana"));

describe("DemographicsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("demographics-skeleton")).toBeInTheDocument();
  });

  it("announces the error and retries the request", async () => {
    const user = userEvent.setup();
    respond(Promise.resolve({ data: undefined, error: { detail: "nope" } }));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las estadísticas.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(statsCalls()).toHaveLength(2));
  });

  // What the API sends for a period with no finalized events, and for one
  // where only staff came, since staff RSVPs are not counted.
  it("shows the empty state when there are no audience RSVPs", async () => {
    respond(ok(stats({ gender: [], age: NO_AGES, summary: NOBODY })));
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows exact headline values and compares with the previous period", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PREVIOUS_PERIOD",
          comparison: {
            ...SUMMARY,
            attended: 96,
            median_age: 31.2,
            known_age_share: 0.8,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Edad mediana", "value")).toBe("32,7");
    expect(slot("Edad mediana", "comparison")).toBe(
      "+1,5 años vs. período anterior",
    );
    expect(slot("Con edad conocida", "value")).toBe("90%");
    expect(slot("Con edad conocida", "comparison")).toBe(
      "+10 pts vs. período anterior",
    );
    expect(slot("Con edad conocida", "sample")).toBeNull();
    expect(slot("Asistencias", "value")).toBe("120");
    expect(slot("Asistencias", "comparison")).toBe("+25% vs. período anterior");
  });

  it("compares one event with the period without comparing the counts", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            ...SUMMARY,
            attended: 4000,
            median_age: 31.2,
            known_age_share: 0.8,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot("Edad mediana", "comparison")).toBe("promedio: 31,2");
    expect(slot("Con edad conocida", "comparison")).toBe("promedio: 80%");
    expect(slot("Asistencias", "comparison")).toBeNull();
  });

  it("shows dashes when everyone expected was a no-show", async () => {
    respond(
      ok(
        stats({
          gender: withShares([group(null, 3, 3)]),
          age: withShares(
            NO_AGES.map((g) => (g.key === "UNKNOWN" ? group(g.key, 3, 3) : g)),
          ),
          summary: NOBODY,
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Edad mediana", "value")).toBe("–");
    expect(slot("Con edad conocida", "value")).toBe("–");
    expect(slot("Asistencias", "value")).toBe("0");
    expect(slot("Con edad conocida", "sample")).toBeNull();
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("labels gender groups through the Mazmo labels and shows unknown codes raw", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(part(groupRow("Hombre"), "expected")).toBe("100");
    expect(part(groupRow("NEW_CODE"), "expected")).toBe("4");
    expect(part(groupRow("Sin dato"), "expected")).toBe("32");
    expect(part(groupRow("18-24"), "expected")).toBe("40");
    expect(part(groupRow("50+"), "expected")).toBe("5");
  });

  it("lists the no-show rates in a table and dims small groups with n", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();

    expect(
      screen.getAllByRole("columnheader").map((th) => th.textContent),
    ).toEqual(["Grupo", "Se esperaban", "No-show"]);

    const male = groupRow("Hombre");
    expect(part(male, "rate-value")).toBe("10%");
    expect(part(male, "sample")).toBeNull();
    expect(male.querySelector('[data-slot="rate"]')).not.toHaveClass(
      "text-muted-foreground",
    );

    const small = groupRow("NEW_CODE");
    expect(part(small, "rate-value")).toBe("50%");
    expect(part(small, "sample")).toBe("n = 4");
    expect(small.querySelector('[data-slot="rate"]')).toHaveClass(
      "text-muted-foreground",
    );

    const unknown = groupRow("Sin dato");
    expect(part(unknown, "rate-value")).toBe("13%");
    expect(part(unknown, "sample")).toBeNull();
  });

  it("names the no-show table after its card", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(
      screen.getByRole("table", { name: "No-show por grupo" }),
    ).toBeInTheDocument();
  });

  it("names the known-age card in English", async () => {
    localStorage.setItem("lang", "en");
    respond(ok(stats()));
    renderTab();
    await waitFor(() => headline("Known age"));
    expect(slot("Known age", "value")).toBe("90%");
  });

  it("shows n under the known-age share when few people attended", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, attended: 5 } })));
    renderTab();
    await headlinesReady();
    expect(slot("Con edad conocida", "sample")).toBe("n = 5");
  });

  it("shows no n for a group whose RSVPs were all cancelled", async () => {
    respond(
      ok(stats({ gender: withShares([...GENDER, group("FEMALE", 0, 0)]) })),
    );
    renderTab();
    await headlinesReady();
    const row = groupRow("Mujer");
    expect(part(row, "rate-value")).toBe("–");
    expect(part(row, "sample")).toBeNull();
  });

  it("splits the table into gender and age groups", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const headers = Array.from(
      document.querySelectorAll<HTMLElement>('th[scope="rowgroup"]'),
    );
    expect(headers.map((th) => th.textContent)).toEqual(["Género", "Edad"]);
    const rowsOf = (th: HTMLElement) =>
      Array.from(
        th.closest("tbody")!.querySelectorAll('[data-slot="group"]'),
      ).map((el) => el.textContent);
    expect(rowsOf(headers[0])).toEqual(["Hombre", "NEW_CODE", "Sin dato"]);
    expect(rowsOf(headers[1])).toEqual([
      "18-24",
      "25-29",
      "30-34",
      "35-39",
      "40-49",
      "50+",
      "Sin dato",
    ]);
  });

  it("formats the expected counts for the locale", async () => {
    respond(ok(stats({ gender: withShares([group("FEMALE", 12000, 1200)]) })));
    renderTab();
    await headlinesReady();
    expect(part(groupRow("Mujer"), "expected")).toBe("12.000");
  });

  it("explains how gender and age are read", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const gender = screen.getByText(/^El género sale del perfil de Mazmo/);
    expect(gender.tagName).toBe("BLOCKQUOTE");
    expect(gender).toHaveTextContent(
      "El género sale del perfil de Mazmo. Cada asistencia cuenta una vez: alguien que vino a tres eventos cuenta tres veces. Quien no tiene perfil de Mazmo aparece como Sin dato.",
    );
    const age = screen.getByText(/^La edad es la que figura hoy en Mazmo/);
    expect(age.tagName).toBe("BLOCKQUOTE");
    expect(age).toHaveTextContent(
      "La edad es la que figura hoy en Mazmo, no la que tenía el día del evento. Las edades menores de 18 o mayores de 99 cuentan como Sin dato, porque algunos perfiles tienen edades inventadas.",
    );
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/demographics",
      {
        params: {
          path: { org_id: "org-1" },
          query: { from: "2026-03-01", to: "2026-04-01", meetup_id: "m1" },
        },
      },
    );
  });

  it("waits without fetching while the query is null", () => {
    respond(ok(stats()));
    renderTab({ query: null });
    expect(screen.getByTestId("demographics-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
