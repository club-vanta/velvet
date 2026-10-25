import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import type { components } from "@/api/types";
import { LanguageProvider } from "@/lib/i18n";
import { meetupWeatherKey, statsOrgKey } from "@/lib/queryKeys";
import { MeetupWeather } from "./MeetupWeather";

type Weather = components["schemas"]["MeetupWeatherPublic"];
type WeatherStatus = components["schemas"]["MeetupWeatherStatusPublic"];

const mockApiGet = vi.fn();
const mockApiPost = vi.fn();
vi.mock("@/api/client", () => ({
  api: {
    GET: (...a: unknown[]) => mockApiGet(...a),
    POST: (...a: unknown[]) => mockApiPost(...a),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const WEATHER: Weather = {
  avg_temperature: 22.46,
  avg_apparent_temperature: 24,
  total_precipitation_mm: 3.2,
  max_wind_kmh: 18.75,
  rained: true,
  fetched_at: "2026-10-02T06:00:00Z",
  source: "open-meteo-historical-forecast",
};
const OK: WeatherStatus = { status: "OK", weather: WEATHER, ready: true };

function renderWeather(canRefresh = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <LanguageProvider>
        <MeetupWeather
          orgId="org-1"
          meetupId="meetup-1"
          canRefresh={canRefresh}
        />
      </LanguageProvider>
    </QueryClientProvider>,
  );
  return { invalidate, client };
}

const respondWith = (data: WeatherStatus) =>
  mockApiGet.mockResolvedValue({ data, error: undefined });

const value = (slot: string) =>
  document.querySelector(`[data-slot="${slot}"]`)?.textContent;

describe("MeetupWeather", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("lang", "en");
  });

  it("titles the card with a level 2 heading", async () => {
    respondWith(OK);
    renderWeather();

    expect(
      await screen.findByRole("heading", { name: "Weather", level: 2 }),
    ).toBeInTheDocument();
  });

  it("requests the weather of the meetup", async () => {
    respondWith(OK);
    renderWeather();

    await screen.findByText("Temperature");

    expect(mockApiGet).toHaveBeenCalledWith(
      "/organizations/{org_id}/meetups/{meetup_id}/weather",
      { params: { path: { org_id: "org-1", meetup_id: "meetup-1" } } },
    );
  });

  describe("OK", () => {
    it("shows each value with one decimal and its unit", async () => {
      respondWith(OK);
      renderWeather();

      await screen.findByText("Temperature");

      expect(value("weather-temperature")).toBe("22.5 °C");
      expect(value("weather-feels-like")).toBe("24.0 °C");
      expect(value("weather-rain")).toBe("It rained, 3.2 mm");
      expect(value("weather-wind")).toBe("18.8 km/h");
    });

    it("formats numbers with the Spanish separator", async () => {
      localStorage.setItem("lang", "es");
      respondWith(OK);
      renderWeather();

      await screen.findByText("Temperatura");

      expect(value("weather-temperature")).toBe("22,5 °C");
      expect(value("weather-rain")).toBe("Llovió, 3,2 mm");
    });

    it("says it did not rain", async () => {
      respondWith({
        ...OK,
        weather: { ...WEATHER, rained: false, total_precipitation_mm: 0 },
      });
      renderWeather();

      await screen.findByText("Temperature");

      expect(value("weather-rain")).toBe("No rain, 0.0 mm");
    });

    it("shows No data for every null value", async () => {
      localStorage.setItem("lang", "es");
      respondWith({
        ...OK,
        weather: {
          ...WEATHER,
          avg_temperature: null,
          avg_apparent_temperature: null,
          total_precipitation_mm: null,
          max_wind_kmh: null,
          rained: null,
        },
      });
      renderWeather();

      await screen.findByText("Temperatura");

      expect(value("weather-temperature")).toBe("Sin dato");
      expect(value("weather-feels-like")).toBe("Sin dato");
      expect(value("weather-rain")).toBe("Sin dato");
      expect(value("weather-wind")).toBe("Sin dato");
    });

    it("shows the amount when only the verdict is unknown", async () => {
      respondWith({
        ...OK,
        weather: { ...WEATHER, rained: null, total_precipitation_mm: 1 },
      });
      renderWeather();

      await screen.findByText("Temperature");

      expect(value("weather-rain")).toBe("1.0 mm");
    });

    it("cites the data source", async () => {
      respondWith(OK);
      renderWeather();

      expect(
        await screen.findByText("Data: Open-Meteo, the 6 hours from the start"),
      ).toBeInTheDocument();
    });
  });

  describe.each([
    ["NO_LOCATION", false, "Set the location to see the weather"],
    ["PENDING", false, "The weather loads 2 hours after the event ends"],
    ["NOT_FETCHED", true, "The weather has not loaded yet"],
  ] as const)("%s", (status, ready, reason) => {
    it("shows the reason instead of values", async () => {
      respondWith({ status, weather: null, ready });
      renderWeather();

      expect(await screen.findByText(reason)).toBeInTheDocument();
      expect(screen.queryByText("Temperature")).not.toBeInTheDocument();
    });
  });

  it("shows a busy, labelled placeholder before the data arrives", () => {
    mockApiGet.mockReturnValue(new Promise(() => {}));
    renderWeather();

    expect(screen.getByRole("status", { name: "Weather" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("tells staff that an admin sets the location", async () => {
    respondWith({ status: "NO_LOCATION", weather: null, ready: false });
    renderWeather(false);

    expect(
      await screen.findByText(
        "An admin can set the location to see the weather",
      ),
    ).toBeInTheDocument();
  });

  it("keeps showing the data when a background refetch fails", async () => {
    respondWith(OK);
    const { client } = renderWeather();
    await screen.findByText("Temperature");

    mockApiGet.mockResolvedValue({ data: undefined, error: { detail: "x" } });
    await client.refetchQueries({
      queryKey: meetupWeatherKey("org-1", "meetup-1"),
    });

    expect(value("weather-temperature")).toBe("22.5 °C");
    expect(screen.queryByText("Failed to load the weather.")).toBeNull();
  });

  it("shows an error with a retry that loads again", async () => {
    const user = userEvent.setup();
    mockApiGet.mockResolvedValueOnce({
      data: undefined,
      error: { detail: "boom" },
    });
    renderWeather();

    expect(
      await screen.findByText("Failed to load the weather."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update weather" })).toBeNull();

    respondWith(OK);
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Temperature")).toBeInTheDocument();
  });

  describe("refresh button", () => {
    it.each([
      ["OK", OK],
      ["NOT_FETCHED", { status: "NOT_FETCHED", weather: null, ready: true }],
    ] as const)("is offered to admins when %s", async (_name, data) => {
      respondWith(data);
      renderWeather(true);

      expect(
        await screen.findByRole("button", { name: "Update weather" }),
      ).toBeEnabled();
    });

    it.each([
      [
        "NO_LOCATION",
        { status: "NO_LOCATION", weather: null, ready: false },
        "Set the location to see the weather",
      ],
      [
        "PENDING",
        { status: "PENDING", weather: null, ready: false },
        "The weather loads 2 hours after the event ends",
      ],
    ] as const)("is hidden to admins when %s", async (_name, data, reason) => {
      respondWith(data);
      renderWeather(true);

      await screen.findByText(reason);

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("is never offered to staff", async () => {
      respondWith(OK);
      renderWeather(false);

      await screen.findByText("Temperature");

      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("posts the refresh, then toasts and invalidates the weather and the stats", async () => {
      const user = userEvent.setup();
      respondWith(OK);
      mockApiPost.mockResolvedValue({ data: WEATHER, error: undefined });
      const { invalidate } = renderWeather();

      await user.click(
        await screen.findByRole("button", { name: "Update weather" }),
      );

      expect(mockApiPost).toHaveBeenCalledWith(
        "/organizations/{org_id}/meetups/{meetup_id}/weather/refresh",
        { params: { path: { org_id: "org-1", meetup_id: "meetup-1" } } },
      );
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Weather updated"),
      );
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: meetupWeatherKey("org-1", "meetup-1"),
      });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: statsOrgKey("org-1"),
      });
    });

    it("is busy and inert while refreshing, and keeps focus", async () => {
      const user = userEvent.setup();
      respondWith(OK);
      let finish: (v: unknown) => void = () => {};
      mockApiPost.mockReturnValue(new Promise((r) => (finish = r)));
      renderWeather();

      const button = await screen.findByRole("button", {
        name: "Update weather",
      });
      await user.click(button);

      await waitFor(() => expect(button).toHaveAttribute("aria-busy", "true"));
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveFocus();

      finish({ data: WEATHER, error: undefined });
      await waitFor(() => expect(button).toHaveAttribute("aria-busy", "false"));
      expect(button).toHaveAttribute("aria-disabled", "false");
      expect(button).toHaveFocus();
      expect(mockApiPost).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        "409",
        "The event ended less than 2 hours ago",
        "The event ended less than 2 hours ago",
      ],
      [
        "502",
        "Open-Meteo has no data for that place",
        "Open-Meteo has no data for that place",
      ],
    ])("shows the backend message on a %s", async (_code, detail, expected) => {
      const user = userEvent.setup();
      respondWith(OK);
      mockApiPost.mockResolvedValue({ data: undefined, error: { detail } });
      renderWeather();

      await user.click(
        await screen.findByRole("button", { name: "Update weather" }),
      );

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expected));
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("falls back to a generic message when the error has no detail", async () => {
      const user = userEvent.setup();
      respondWith(OK);
      mockApiPost.mockResolvedValue({ data: undefined, error: {} });
      renderWeather();

      await user.click(
        await screen.findByRole("button", { name: "Update weather" }),
      );

      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to update the weather.",
        ),
      );
    });
  });
});
