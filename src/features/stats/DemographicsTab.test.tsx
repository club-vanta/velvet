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
type Group = components["schemas"]["DemographicGroupPublic"];

const SUMMARY: Summary = {
  attended: 200,
  median_age: 32.7,
  known_age_share: 0.9,
  gender_shares: [],
  age_shares: [],
};

const NOBODY: Summary = {
  attended: 0,
  median_age: null,
  known_age_share: null,
  gender_shares: [],
  age_shares: [],
};

/** A group whose figures agree: no-shows come from the rate, the rest attended. */
function group(key: string | null, expected: number, rate: number | null) {
  const noShow = rate === null ? 0 : Math.round(expected * rate);
  const attended = expected - noShow;
  const g: Group = {
    key,
    attended,
    expected,
    no_show: noShow,
    no_show_rate: rate,
    attended_share: attended > 0 ? 0.25 : null,
    expected_share: expected > 0 ? 0.25 : null,
  };
  return g;
}

const GENDER = [
  group("MALE", 100, 0.1),
  group("NEW_CODE", 4, 0.5),
  group(null, 30, null),
];

const AGE = [
  group("AGE_18_24", 50, 0.2),
  group("AGE_25_29", 60, 0.1),
  group("AGE_30_34", 40, 0.05),
  group("AGE_35_39", 20, 0.1),
  group("AGE_40_49", 10, 0.3),
  group("AGE_50_PLUS", 5, 0.4),
  group("UNKNOWN", 15, 0.1),
];

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

  it("shows the empty state when nobody attended and nobody was expected", async () => {
    respond(
      ok(
        stats({
          gender: [group(null, 0, null)],
          age: AGE.map((g) => group(g.key, 0, null)),
          summary: NOBODY,
        }),
      ),
    );
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
            attended: 160,
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
    expect(slot("Asistencias", "value")).toBe("200");
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
    expect(slot("Con edad conocida", "comparison")).toBe(
      "+10 pts vs. el período",
    );
    expect(slot("Asistencias", "comparison")).toBeNull();
  });

  it("shows dashes when only staff attended", async () => {
    respond(
      ok(
        stats({
          gender: [group(null, 3, 1)],
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
    expect(part(groupRow("Sin dato"), "expected")).toBe("30");
    expect(part(groupRow("18-24"), "expected")).toBe("50");
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

    const none = groupRow("Sin dato");
    expect(part(none, "rate-value")).toBe("–");
    expect(part(none, "sample")).toBeNull();
  });

  it("names the no-show table after its card", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(
      screen.getByRole("table", { name: "No-show por grupo" }),
    ).toBeInTheDocument();
  });

  it("shows n under the known-age share when few people attended", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, attended: 5 } })));
    renderTab();
    await headlinesReady();
    expect(slot("Con edad conocida", "sample")).toBe("n = 5");
  });

  it("shows no n for a group with nobody expected", async () => {
    respond(ok(stats({ gender: [...GENDER, group("FEMALE", 0, null)] })));
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
    respond(ok(stats({ gender: [group("FEMALE", 12000, 0.1)] })));
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
