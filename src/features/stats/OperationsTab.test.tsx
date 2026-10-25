import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { OperationsTab } from "./OperationsTab";
import type { StatsTabProps } from "./statsTab";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

type Operations = components["schemas"]["OperationsStatsPublic"];
type Summary = components["schemas"]["OperationsSummaryPublic"];
type Payments = components["schemas"]["OperationsPaymentStatsPublic"];
type Ban = components["schemas"]["BanRowPublic"];

const SUMMARY: Summary = {
  attended: 300,
  paid_share: 0.9,
  avg_peak_checkins: 40,
  bans: 3,
};

const NOBODY: Summary = {
  attended: 0,
  paid_share: null,
  avg_peak_checkins: null,
  bans: 0,
};

const PAYMENTS: Payments = {
  paying_events: 2,
  paid: 180,
  pending: 20,
  exempt: 100,
  cancelled_but_paid: 4,
  paid_share: 0.9,
};

const BANS: Ban[] = [
  {
    guest_id: "g-ana",
    displayname: "Ana",
    reason: "Acoso",
    // 22:30 on Jan 9 in Buenos Aires.
    timestamp: "2026-01-10T01:30:00",
    actor_username: "marta",
  },
  {
    guest_id: "g-beto",
    displayname: "Beto",
    reason: null,
    timestamp: "2025-12-20T02:00:00Z",
    actor_username: null,
  },
];

function stats(overrides: Partial<Operations> = {}): Operations {
  return {
    summary: SUMMARY,
    guest_types: [
      { guest_type: "NORMAL", attended: 200, share: 0.6667 },
      { guest_type: "INVITED", attended: 50, share: 0.1667 },
      { guest_type: "STAFF", attended: 30, share: 0.1 },
      { guest_type: "VENDOR", attended: 20, share: 0.0667 },
    ],
    payments: PAYMENTS,
    staff: [
      { user_id: 1, username: "marta", checkins: 200 },
      { user_id: 2, username: "juan", checkins: 70 },
      { user_id: null, username: null, checkins: 30 },
    ],
    busiest: {
      meetup_id: "m1",
      meetup_name: "Alter Marzo",
      local_time: "23:15",
      checkins: 62,
    },
    ban_list: BANS,
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
        <MemoryRouter>
          <OperationsTab
            orgId="org-1"
            query={PERIOD}
            onShowAll={onShowAll}
            {...props}
          />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { onShowAll };
}

const ok = (data: Operations) => Promise.resolve({ data, error: undefined });
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

const part = (el: Element, name: string) =>
  el.querySelector(`[data-slot="${name}"]`)?.textContent ?? null;

const statsCalls = () =>
  mockApiGet.mock.calls.filter(
    ([path]) => path === "/organizations/{org_id}/stats/operations",
  );

const headlinesReady = () => waitFor(() => headline("Ingresaron"));

const notes = () =>
  Array.from(document.querySelectorAll("blockquote")).map(
    (el) => el.textContent,
  );

describe("OperationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubEnv("TZ", "America/Argentina/Buenos_Aires");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows a skeleton while loading", () => {
    respond(new Promise(() => {}));
    renderTab();
    expect(screen.getByTestId("operations-skeleton")).toBeInTheDocument();
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

  it("shows the empty state when nobody came in", async () => {
    respond(
      ok(
        stats({
          summary: NOBODY,
          guest_types: [],
          payments: null,
          staff: [],
          busiest: null,
          ban_list: [],
        }),
      ),
    );
    renderTab();
    expect(
      await screen.findByText("No hay eventos finalizados en este período"),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-headline]")).toBeNull();
  });

  it("shows exact headline values and compares with the previous period", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PREVIOUS_PERIOD",
          comparison: {
            attended: 250,
            paid_share: 0.85,
            avg_peak_checkins: 32,
            bans: 1,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Ingresaron", "value")).toBe("300");
    expect(slot("Ingresaron", "comparison")).toBe("+20% vs. período anterior");
    expect(slot("Pagaron", "value")).toBe("90%");
    expect(slot("Pagaron", "comparison")).toBe("+5 pts vs. período anterior");
    expect(slot("Pagaron", "sample")).toBeNull();
    expect(slot("Pico en la puerta", "value")).toBe("62");
    expect(slot("Pico en la puerta", "subline")).toBe("Alter Marzo · 23:15");
    expect(slot("Pico en la puerta", "comparison")).toBe(
      "+25% vs. período anterior",
    );
    expect(slot("Baneos", "value")).toBe("3");
    expect(slot("Baneos", "comparison")).toBe("+200% vs. período anterior");
  });

  it("formats the counts for the locale", async () => {
    respond(
      ok(stats({ summary: { ...SUMMARY, attended: 12000, bans: 15000 } })),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Ingresaron", "value")).toBe("12.000");
    expect(slot("Baneos", "value")).toBe("15.000");
  });

  it("dims the paid share with n when few people owed entry", async () => {
    respond(ok(stats({ payments: { ...PAYMENTS, paid: 5, pending: 2 } })));
    renderTab();
    await headlinesReady();
    expect(slot("Pagaron", "sample")).toBe("n = 7");
  });

  it("shows a dash and no n when nobody owed entry", async () => {
    respond(
      ok(
        stats({
          summary: { ...SUMMARY, paid_share: null },
          payments: {
            ...PAYMENTS,
            paid: 0,
            pending: 0,
            paid_share: null,
          },
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Pagaron", "value")).toBe("–");
    expect(slot("Pagaron", "sample")).toBeNull();
  });

  it("shows dashes for the peak when there is no busiest slot", async () => {
    respond(
      ok(
        stats({
          summary: { ...SUMMARY, avg_peak_checkins: null },
          busiest: null,
        }),
      ),
    );
    renderTab();
    await headlinesReady();
    expect(slot("Pico en la puerta", "value")).toBe("–");
    expect(slot("Pico en la puerta", "subline")).toBeNull();
  });

  it("hides the paid headline and the payments card without paying events", async () => {
    respond(
      ok(stats({ payments: null, summary: { ...SUMMARY, paid_share: null } })),
    );
    renderTab();
    await headlinesReady();
    expect(() => headline("Pagaron")).toThrow();
    expect(screen.queryByText("Pagos")).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-headline]")).toHaveLength(3);
    expect(notes()).toEqual([
      "Esta pestaña cuenta a todos los que entraron, staff y vendors incluidos.",
    ]);
  });

  it("compares one event with the period average, except the totals", async () => {
    respond(
      ok(
        stats({
          comparison_kind: "PERIOD_AVERAGE",
          comparison: {
            attended: 4000,
            paid_share: 0.8,
            avg_peak_checkins: 35.5,
            bans: 20,
          },
        }),
      ),
    );
    renderTab({ query: { meetupId: "m1" } });
    await headlinesReady();
    expect(slot("Ingresaron", "comparison")).toBeNull();
    expect(slot("Baneos", "comparison")).toBeNull();
    expect(slot("Pagaron", "comparison")).toBe("promedio: 80%");
    expect(slot("Pico en la puerta", "comparison")).toBe("promedio: 35,5");
    expect(slot("Pico en la puerta", "subline")).toBe("23:15");
  });

  it("lists every guest type in order with its count and share", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const items = within(
      screen.getByRole("region", { name: "Tipos de invitado" }),
    ).getAllByRole("listitem");
    expect(items.map((li) => part(li, "name"))).toEqual([
      "General",
      "Cortesía",
      "Staff",
      "Stand",
    ]);
    expect(items.map((li) => part(li, "count"))).toEqual([
      "200",
      "50",
      "30",
      "20",
    ]);
    expect(items.map((li) => part(li, "share"))).toEqual([
      "67%",
      "17%",
      "10%",
      "7%",
    ]);
  });

  it("shows the payment counts and the cancelled-after-paying line", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const card = screen.getByRole("region", { name: "Pagos" });
    expect(part(card, "paid")).toBe("180");
    expect(part(card, "pending")).toBe("20");
    expect(part(card, "exempt")).toBe("100");
    expect(part(card, "cancelled-paid")).toBe("4 se bajaron después de pagar");
  });

  it("leaves out the cancelled-after-paying line when nobody did", async () => {
    respond(ok(stats({ payments: { ...PAYMENTS, cancelled_but_paid: 0 } })));
    renderTab();
    await headlinesReady();
    expect(document.querySelector('[data-slot="cancelled-paid"]')).toBeNull();
  });

  it("lists the check-ins per staff member, with one row for no recorded checker", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    const items = within(
      screen.getByRole("region", { name: "Check-ins por persona del staff" }),
    ).getAllByRole("listitem");
    expect(items.map((li) => part(li, "name"))).toEqual([
      "marta",
      "juan",
      "Sin registro",
    ]);
    expect(items.map((li) => part(li, "count"))).toEqual(["200", "70", "30"]);
  });

  it("lists the bans with dashes for a missing reason or actor, linked to the guest", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, bans: 2 } })));
    renderTab();
    await headlinesReady();
    expect(screen.getByRole("link", { name: "Ana" })).toHaveAttribute(
      "href",
      "/guests/g-ana",
    );
    expect(screen.getByRole("link", { name: "Beto" })).toHaveAttribute(
      "href",
      "/guests/g-beto",
    );
    const ana = screen.getByRole("link", { name: "Ana" }).closest("li")!;
    expect(part(ana, "reason")).toBe("Acoso");
    expect(part(ana, "date")).toBe("9 de ene de 2026");
    expect(part(ana, "actor")).toBe("marta");
    const beto = screen.getByRole("link", { name: "Beto" }).closest("li")!;
    expect(part(beto, "reason")).toBe("–");
    expect(part(beto, "actor")).toBe("–");
    expect(document.querySelector('[data-slot="bans-more"]')).toBeNull();
  });

  it("says how many more bans there are than listed", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, bans: 25 } })));
    renderTab();
    await headlinesReady();
    expect(document.querySelector('[data-slot="bans-more"]')?.textContent).toBe(
      "y 23 más",
    );
  });

  it("leaves out the bans card when there are none", async () => {
    respond(ok(stats({ summary: { ...SUMMARY, bans: 0 }, ban_list: [] })));
    renderTab();
    await headlinesReady();
    expect(screen.queryByRole("region", { name: "Baneos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ana" })).toBeNull();
  });

  it("explains who is counted and what pending means", async () => {
    respond(ok(stats()));
    renderTab();
    await headlinesReady();
    expect(notes()).toEqual([
      "Esta pestaña cuenta a todos los que entraron, staff y vendors incluidos.",
      "Solo los eventos que cobran entrada. Pendiente es alguien que entró sin un pago registrado.",
    ]);
  });

  it("sends from, to and meetup_id to the API", async () => {
    respond(ok(stats()));
    renderTab({
      query: { from: "2026-03-01", to: "2026-04-01", meetupId: "m1" },
    });
    await headlinesReady();
    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/stats/operations",
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
    expect(screen.getByTestId("operations-skeleton")).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
