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
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
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
    location_label: null,
    latitude: null,
    longitude: null,
  };
}

const MEETUPS = [
  meetup("in-range", "Alter Marzo", new Date(2026, 2, 10, 22), true),
  meetup("open", "Alter Abierto", new Date(2026, 2, 20, 22), false),
  meetup("old", "Alter Viejo", new Date(2025, 10, 1, 22), true),
];

function Probe() {
  const { search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="search">{search}</div>
      <button onClick={() => void navigate(-1)}>back</button>
    </>
  );
}

const meetupsOk = (meetups: Meetup[]) =>
  Promise.resolve({
    data: { total: meetups.length, meetups },
    error: undefined,
  });

function renderPage(
  url = "/stats",
  meetupsResult: () => unknown = () => meetupsOk(MEETUPS),
) {
  // The attendance tab has its own tests, so its request just stays pending.
  mockApiGet.mockImplementation((path: string) =>
    path === "/organizations/{org_id}/stats/attendance" ||
    path === "/organizations/{org_id}/stats/arrivals" ||
    path === "/organizations/{org_id}/stats/demographics" ||
    path === "/organizations/{org_id}/stats/retention" ||
    path === "/organizations/{org_id}/stats/operations"
      ? new Promise(() => {})
      : meetupsResult(),
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
  await user.click(screen.getByRole("combobox", { name: /^Período: / }));
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
    await user.click(screen.getByRole("combobox", { name: /^Evento: / }));
    const options = (await screen.findAllByRole("option")).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(["Todos los eventos", "Alter Marzo · 10/03"]);
  });

  it("writes meetup=<id> for an event and removes it for all events", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Todos los eventos");
    await user.click(screen.getByRole("combobox", { name: /^Evento: / }));
    await user.click(
      await screen.findByRole("option", { name: "Alter Marzo · 10/03" }),
    );
    expect(search()).toBe("?meetup=in-range");

    await user.click(screen.getByRole("combobox", { name: /^Evento: / }));
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
    expect(
      screen.getByRole("combobox", { name: /^Evento: / }),
    ).toHaveTextContent("Todos los eventos");
  });

  it("treats an empty meetup param as no event", async () => {
    renderPage("/stats?meetup=");
    expect(
      screen.getByRole("combobox", { name: /^Evento: / }),
    ).toHaveTextContent("Todos los eventos");
  });

  it("names the selects by label and visible value", async () => {
    renderPage();
    await screen.findByText("Todos los eventos");
    expect(
      screen.getByRole("combobox", { name: "Período: Últimos 3 meses" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Evento: Todos los eventos" }),
    ).toBeInTheDocument();
  });

  it("undoes a picked event with the browser back button", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Todos los eventos");
    await user.click(screen.getByRole("combobox", { name: /^Evento: / }));
    await user.click(
      await screen.findByRole("option", { name: "Alter Marzo · 10/03" }),
    );
    expect(search()).toBe("?meetup=in-range");

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(search()).toBe("");
    expect(
      screen.getByRole("combobox", { name: "Evento: Todos los eventos" }),
    ).toBeInTheDocument();
  });

  it("keeps the selected event when the meetups fail to load", async () => {
    const user = userEvent.setup();
    const failure = () =>
      Promise.resolve({ data: undefined, error: { detail: "nope" } });
    renderPage("/stats?meetup=in-range", failure);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudieron cargar las estadísticas.",
    );
    expect(search()).toBe("?meetup=in-range");
    expect(screen.queryByTestId("attendance-skeleton")).not.toBeInTheDocument();

    const meetupCalls = () =>
      mockApiGet.mock.calls.filter(
        ([path]) => path === "/organizations/{org_id}/meetups/",
      );
    expect(meetupCalls()).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(meetupCalls()).toHaveLength(2));
    expect(search()).toBe("?meetup=in-range");

    await user.click(
      screen.getByRole("button", { name: "Ver todos los eventos" }),
    );
    expect(search()).toBe("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("selects Horarios for tab=arrivals", () => {
    renderPage("/stats?tab=arrivals");
    expect(screen.getByRole("tab", { name: "Horarios" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("falls back to Asistencia for an unknown tab", () => {
    renderPage("/stats?tab=bogus");
    expect(screen.getByRole("tab", { name: "Asistencia" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("writes the tab to the URL and Back returns to Asistencia", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Horarios" }));
    expect(search()).toBe("?tab=arrivals");
    expect(screen.getByRole("tab", { name: "Horarios" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(search()).toBe("");
    expect(screen.getByRole("tab", { name: "Asistencia" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  describe("tab requests", () => {
    const statsPaths = () =>
      mockApiGet.mock.calls
        .map(([path]) => path as string)
        .filter((path) => path.includes("/stats/"));

    it("does not request the arrivals of a hidden tab", async () => {
      renderPage("/stats?tab=attendance");
      await screen.findByTestId("attendance-skeleton");
      expect(statsPaths()).toEqual([
        "/organizations/{org_id}/stats/attendance",
      ]);
    });

    it("requests only the demographics of tab=demographics", async () => {
      renderPage("/stats?tab=demographics");
      await screen.findByTestId("demographics-skeleton");
      expect(statsPaths()).toEqual([
        "/organizations/{org_id}/stats/demographics",
      ]);
    });

    it("requests only the retention of tab=retention", async () => {
      renderPage("/stats?tab=retention");
      await screen.findByTestId("retention-skeleton");
      expect(screen.getByRole("tab", { name: "Fidelidad" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(statsPaths()).toEqual(["/organizations/{org_id}/stats/retention"]);
    });

    it("requests only the operations of tab=operations", async () => {
      renderPage("/stats?tab=operations");
      await screen.findByTestId("operations-skeleton");
      expect(screen.getByRole("tab", { name: "Operación" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(statsPaths()).toEqual([
        "/organizations/{org_id}/stats/operations",
      ]);
    });

    it("does not request the attendance of a hidden tab", async () => {
      renderPage("/stats?tab=arrivals");
      await screen.findByTestId("arrivals-skeleton");
      expect(statsPaths()).toEqual(["/organizations/{org_id}/stats/arrivals"]);
    });
  });

  it("replaces the history entry for each custom date pick", async () => {
    const user = userEvent.setup();
    renderPage();
    await choosePeriod(user, "Rango a medida");
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-02-01" },
    });
    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-03-01" },
    });
    expect(search()).toBe("?range=custom&from=2026-02-01&to=2026-03-01");

    await user.click(screen.getByRole("button", { name: "back" }));
    expect(search()).toBe("");
  });

  it("moves the other date along when a custom range would turn around", () => {
    renderPage("/stats?range=custom&from=2026-03-01&to=2026-03-31");
    fireEvent.change(screen.getByLabelText("Desde"), {
      target: { value: "2026-04-10" },
    });
    expect(search()).toBe("?range=custom&from=2026-04-10&to=2026-04-10");

    fireEvent.change(screen.getByLabelText("Hasta"), {
      target: { value: "2026-02-01" },
    });
    expect(search()).toBe("?range=custom&from=2026-02-01&to=2026-02-01");
  });

  describe("in Buenos Aires", () => {
    beforeEach(() => vi.stubEnv("TZ", "America/Argentina/Buenos_Aires"));
    afterEach(() => vi.unstubAllEnvs());

    it("labels a late event with its local day", async () => {
      const user = userEvent.setup();
      // 22:30 on Apr 4 in Buenos Aires.
      const late: Meetup = {
        ...meetup("late", "Alter Tarde", new Date(0), true),
        date: "2026-04-05T01:30:00Z",
      };
      renderPage("/stats", () => meetupsOk([late]));
      await screen.findByText("Todos los eventos");
      await user.click(screen.getByRole("combobox", { name: /^Evento: / }));
      expect(
        await screen.findByRole("option", { name: "Alter Tarde · 04/04" }),
      ).toBeInTheDocument();
    });
  });
});
