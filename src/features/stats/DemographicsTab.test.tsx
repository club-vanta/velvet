import { render, screen, waitFor, within } from "@testing-library/react";
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

/** A group of `attended` people; `withShares` fills in its share of the total. */
function group<K extends GenderGroup["key"] | AgeGroup["key"]>(
  key: K,
  attended: number,
) {
  const g: Omit<GenderGroup, "key"> & { key: K } = {
    key,
    attended,
    attended_share: null,
  };
  return g;
}

/** Each group's share of the attended total, null on a zero total. */
function withShares<G extends GenderGroup | AgeGroup>(groups: G[]): G[] {
  const attended = groups.reduce((sum, g) => sum + g.attended, 0);
  return groups.map((g) => ({
    ...g,
    attended_share: share(g.attended, attended),
  }));
}

// Gender and age split the same attendances, so their totals agree.
const GENDER: GenderGroup[] = withShares([
  group("MALE", 90),
  group("NEW_CODE", 2),
  group(null, 28),
]);

const AGE: AgeGroup[] = withShares([
  group("AGE_18_24", 34),
  group("AGE_25_29", 32),
  group("AGE_30_34", 21),
  group("AGE_35_39", 10),
  group("AGE_40_49", 7),
  group("AGE_50_PLUS", 4),
  group("UNKNOWN", 12),
]);

/** Every age bucket with nothing in it: the API always sends all seven. */
const NO_AGES: AgeGroup[] = AGE.map((g) => group(g.key, 0));

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

/** The header and body rows of a sr-only chart table, as text. */
function tableText(name: string) {
  const table = screen.getByRole("table", { name, hidden: true });
  // sr-only sits on the wrapper: a table ignores a width limit.
  expect(table).not.toHaveClass("sr-only");
  expect(table.parentElement).toHaveClass("sr-only");
  const [header, ...body] = within(table).getAllByRole("row", { hidden: true });
  const texts = (row: HTMLElement) =>
    Array.from(row.children).map((c) => c.textContent);
  return { header: texts(header!), body: body.map(texts) };
}

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

  it("lists each group's share of the attendances in text tables, with Mazmo labels and unknown codes raw", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const header = ["Grupo", "Vinieron"];
    expect(tableText("Género")).toEqual({
      header,
      body: [
        ["Hombre", "75%"],
        ["NEW_CODE", "2%"],
        ["Sin dato", "23%"],
      ],
    });
    expect(tableText("Edad")).toEqual({
      header,
      body: [
        ["18-24", "28%"],
        ["25-29", "27%"],
        ["30-34", "18%"],
        ["35-39", "8%"],
        ["40-49", "6%"],
        ["50+", "3%"],
        ["Sin dato", "10%"],
      ],
    });
  });

  it("shows no expected or no-show figures", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(document.body).not.toHaveTextContent("Se esperaban");
    expect(document.body).not.toHaveTextContent("No vinieron");
  });
});
