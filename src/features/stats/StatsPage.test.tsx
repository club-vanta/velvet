import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { StatsPage } from "./StatsPage";
import type { components } from "@/api/types";

const mockApiGet = vi.fn();
vi.mock("@/api/client", () => ({
  api: { GET: (...a: unknown[]) => mockApiGet(...a) },
}));

vi.mock("@/lib/org", () => ({
  useOrg: () => ({
    activeOrg: { org_id: "org-1", org_name: "Club Vanta", role: "ADMIN" },
  }),
}));

type Meetup = components["schemas"]["MeetupPublic"];

// Browser local time, like src/lib/meetupTiming.ts. 3 months back is
// 2026-01-15 and the exclusive end is 2026-04-16.
const TODAY = new Date(2026, 3, 15, 12);

function meetup(
  id: string,
  name: string,
  date: Date,
  is_finalized: boolean,
): Meetup {
  return {
    id,
    name,
    mazmo_meetup_url: `https://mazmo.net/+eventos/${id}`,
    date: date.toISOString(),
    is_finalized,
    finalized_at: null,
    requires_payment: false,
  };
}

const MEETUPS = [
  meetup("in-range", "Alter Marzo", new Date(2026, 2, 10, 22), true),
  meetup("open", "Alter Abierto", new Date(2026, 2, 20, 22), false),
  meetup("old", "Alter Viejo", new Date(2025, 10, 1, 22), true),
];

function Probe() {
  const { search } = useLocation();
  return <div data-testid="search">{search}</div>;
}

function renderPage(url = "/stats", meetups: Meetup[] = MEETUPS) {
  // The attendance tab has its own tests, so its request just stays pending.
  mockApiGet.mockImplementation((path: string) =>
    path === "/organizations/{org_id}/stats/attendance"
      ? new Promise(() => {})
      : Promise.resolve({
          data: { total: meetups.length, meetups },
          error: undefined,
        }),
  );
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <LanguageProvider>
        <MemoryRouter initialEntries={[url]}>
          <StatsPage />
          <Probe />
        </MemoryRouter>
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

const search = () => screen.getByTestId("search").textContent;

async function choosePeriod(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Período" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("StatsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(TODAY);
  });
  afterEach(() => vi.useRealTimers());

  it('renders the default period "Últimos 3 meses" and "Todos los eventos"', async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Estadísticas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Últimos 3 meses")).toBeInTheDocument();
    expect(screen.getByText("Todos los eventos")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Asistencia" })).toBeInTheDocument();
  });

  it('choosing "Este año" writes range=ytd to the URL', async () => {
    const user = userEvent.setup();
    renderPage();
    await choosePeriod(user, "Este año");
    expect(search()).toBe("?range=ytd");
  });

  it("falls back to the default for an invalid range", () => {
    renderPage("/stats?range=bogus");
    expect(screen.getByText("Últimos 3 meses")).toBeInTheDocument();
  });

  it.each([
    "/stats?range=custom&from=garbage&to=2026-03-31",
    "/stats?range=custom&from=2026-02-30&to=2026-03-31",
    "/stats?range=custom&from=2026-03-31&to=2026-03-01",
    "/stats?range=custom&from=2026-03-01",
    "/stats?range=custom",
  ])("falls back to the default for a bad custom range: %s", (url) => {
    renderPage(url);
    expect(screen.getByText("Últimos 3 meses")).toBeInTheDocument();
    expect(screen.queryByLabelText("Desde")).not.toBeInTheDocument();
  });

  it("only offers finalized meetups inside the range, as name and dd/mm", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Todos los eventos");
    await user.click(screen.getByRole("combobox", { name: "Evento" }));
    const options = (await screen.findAllByRole("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Todos los eventos", "Alter Marzo · 10/03"]);
  });

  it("writes meetup=<id> for an event and removes it for all events", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Todos los eventos");
    await user.click(screen.getByRole("combobox", { name: "Evento" }));
    await user.click(
      await screen.findByRole("option", { name: "Alter Marzo · 10/03" }),
    );
    expect(search()).toBe("?meetup=in-range");

    await user.click(screen.getByRole("combobox", { name: "Evento" }));
    await user.click(
      within(await screen.findByRole("listbox")).getByRole("option", {
        name: "Todos los eventos",
      }),
    );
    expect(search()).toBe("");
  });

  it("drops the selected event when the period changes", async () => {
    const user = userEvent.setup();
    renderPage("/stats?meetup=in-range&keep=1");
    await choosePeriod(user, "Últimos 30 días");
    expect(search()).toBe("?keep=1&range=30d");
  });

  it("seeds the custom range with the current period, end inclusive", async () => {
    const user = userEvent.setup();
    renderPage();
    await choosePeriod(user, "Rango a medida");
    expect(search()).toBe("?range=custom&from=2026-01-15&to=2026-04-15");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-01-15");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-04-15");
  });

  it('seeds the last 3 months when switching from "all" to custom', async () => {
    const user = userEvent.setup();
    renderPage("/stats?range=all");
    await choosePeriod(user, "Rango a medida");
    expect(search()).toBe("?range=custom&from=2026-01-15&to=2026-04-15");
  });

  it("ties the date inputs together so from cannot pass to", () => {
    renderPage("/stats?range=custom&from=2026-03-01&to=2026-03-31");
    expect(screen.getByLabelText("Desde")).toHaveAttribute("max", "2026-03-31");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("min", "2026-03-01");
  });

  it("picking a custom date updates the URL and keeps the other params", async () => {
    renderPage("/stats?range=custom&from=2026-03-01&to=2026-03-31&keep=1");
    const from = screen.getByLabelText("Desde");
    fireEvent.change(from, { target: { value: "2026-03-05" } });
    expect(search()).toBe("?range=custom&from=2026-03-05&to=2026-03-31&keep=1");
  });

  it("removes a meetup param that is not an offered event", async () => {
    renderPage("/stats?meetup=old");
    await screen.findByText("Todos los eventos");
    await waitFor(() => expect(search()).toBe(""));
    expect(screen.getByRole("combobox", { name: "Evento" })).toHaveTextContent(
      "Todos los eventos",
    );
  });

  it("treats an empty meetup param as no event", async () => {
    renderPage("/stats?meetup=");
    expect(screen.getByRole("combobox", { name: "Evento" })).toHaveTextContent(
      "Todos los eventos",
    );
  });
});
