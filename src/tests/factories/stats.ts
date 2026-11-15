// Org statistics factories (/organizations/{org_id}/stats/*), one per
// response schema and its parts. The defaults describe one plausible period
// of a club: override only what the test is about.
import type { Schema } from "./schemas";

// Attendance

export function makeAttendanceTotals(
  overrides: Partial<Schema<"AttendanceTotalsPublic">> = {},
): Schema<"AttendanceTotalsPublic"> {
  return {
    events: 5,
    signed_up: 500,
    cancelled: 50,
    attended: 412,
    walkin: 12,
    no_show: 40,
    cancellation_rate: 0.1,
    no_show_rate: 0.18,
    avg_signed_up_per_event: 100,
    avg_attended_per_event: 82.4,
    ...overrides,
  };
}

export function makeAttendanceRow(
  overrides: Partial<Schema<"MeetupAttendanceRowPublic">> = {},
): Schema<"MeetupAttendanceRowPublic"> {
  return {
    meetup_id: "meetup-1",
    name: "Alter Marzo",
    date: "2026-03-10T22:00:00Z",
    signed_up: 100,
    cancelled: 10,
    attended: 80,
    walkin: 2,
    no_show: 10,
    ...overrides,
  };
}

export function makeAttendanceStats(
  overrides: Partial<Schema<"AttendanceStatsPublic">> = {},
): Schema<"AttendanceStatsPublic"> {
  return {
    meetups: [makeAttendanceRow()],
    totals: makeAttendanceTotals(),
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

// Arrivals

export function makeArrivalSummary(
  overrides: Partial<Schema<"ArrivalSummaryPublic">> = {},
): Schema<"ArrivalSummaryPublic"> {
  return {
    arrivals: 200,
    excluded_arrivals: 0,
    peak: { start_minute: 30, arrivals: 40 },
    peak_local_time: "22:30",
    mean_minutes: 45,
    p90_minutes: 90,
    mean_local_time: "22:45",
    p90_local_time: "23:30",
    first_hour_share: 0.86,
    ...overrides,
  };
}

/** The summary of a period in which nobody checked in. */
export function makeEmptyArrivalSummary(): Schema<"ArrivalSummaryPublic"> {
  return makeArrivalSummary({
    arrivals: 0,
    peak: null,
    peak_local_time: null,
    mean_minutes: null,
    p90_minutes: null,
    mean_local_time: null,
    p90_local_time: null,
    first_hour_share: null,
  });
}

export function makeLeadTimeRow(
  overrides: Partial<Schema<"LeadTimeRowPublic">> = {},
): Schema<"LeadTimeRowPublic"> {
  return {
    bucket: "SAME_DAY",
    signed_up: 120,
    cancelled: 20,
    no_show: 10,
    no_show_rate: 0.1,
    ...overrides,
  };
}

/** Every lead-time bucket, in the order the API sends them. */
export function makeLeadTimeRows(): Schema<"LeadTimeRowPublic">[] {
  return [
    makeLeadTimeRow(),
    makeLeadTimeRow({
      bucket: "ONE_DAY",
      signed_up: 60,
      cancelled: 5,
      no_show: 5,
      no_show_rate: 0.09,
    }),
    makeLeadTimeRow({
      bucket: "TWO_THREE",
      signed_up: 12,
      cancelled: 4,
      no_show: 2,
      no_show_rate: 0.25,
    }),
    makeLeadTimeRow({
      bucket: "FOUR_SEVEN",
      signed_up: 8,
      cancelled: 0,
      no_show: 4,
      no_show_rate: 0.5,
    }),
    makeLeadTimeRow({
      bucket: "EIGHT_FOURTEEN",
      signed_up: 0,
      cancelled: 0,
      no_show: 0,
      no_show_rate: null,
    }),
    makeLeadTimeRow({
      bucket: "FIFTEEN_PLUS",
      signed_up: 3,
      cancelled: 3,
      no_show: 0,
      no_show_rate: null,
    }),
  ];
}

export function makeArrivalStats(
  overrides: Partial<Schema<"ArrivalStatsPublic">> = {},
): Schema<"ArrivalStatsPublic"> {
  return {
    curve: [
      { start_minute: 15, arrivals: 20 },
      { start_minute: 30, arrivals: 40 },
    ],
    clock_curve: [
      { start_minute: 1335, local_time: "22:15", arrivals: 20 },
      { start_minute: 1350, local_time: "22:30", arrivals: 40 },
    ],
    summary: makeArrivalSummary(),
    lead_time: makeLeadTimeRows(),
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

// Demographics

export function makeDemographicSummary(
  overrides: Partial<Schema<"DemographicSummaryPublic">> = {},
): Schema<"DemographicSummaryPublic"> {
  return {
    attended: 120,
    median_age: 32.7,
    known_age_share: 0.9,
    ...overrides,
  };
}

export function makeGenderGroup(
  overrides: Partial<Schema<"GenderGroupPublic">> = {},
): Schema<"GenderGroupPublic"> {
  return { key: "MALE", attended: 90, attended_share: 0.75, ...overrides };
}

export function makeAgeGroup(
  overrides: Partial<Schema<"AgeGroupPublic">> = {},
): Schema<"AgeGroupPublic"> {
  return {
    key: "AGE_18_24",
    attended: 34,
    attended_share: 0.2833,
    ...overrides,
  };
}

/** The 120 attendances of the default summary, split by age bucket. */
export function makeAgeGroups(): Schema<"AgeGroupPublic">[] {
  return [
    makeAgeGroup(),
    makeAgeGroup({ key: "AGE_25_29", attended: 32, attended_share: 0.2667 }),
    makeAgeGroup({ key: "AGE_30_34", attended: 21, attended_share: 0.175 }),
    makeAgeGroup({ key: "AGE_35_39", attended: 10, attended_share: 0.0833 }),
    makeAgeGroup({ key: "AGE_40_49", attended: 7, attended_share: 0.0583 }),
    makeAgeGroup({ key: "AGE_50_PLUS", attended: 4, attended_share: 0.0333 }),
    makeAgeGroup({ key: "UNKNOWN", attended: 12, attended_share: 0.1 }),
  ];
}

export function makeDemographicStats(
  overrides: Partial<Schema<"DemographicStatsPublic">> = {},
): Schema<"DemographicStatsPublic"> {
  return {
    gender: [
      makeGenderGroup(),
      makeGenderGroup({ key: "NEW_CODE", attended: 2, attended_share: 0.0167 }),
      makeGenderGroup({ key: null, attended: 28, attended_share: 0.2333 }),
    ],
    age: makeAgeGroups(),
    summary: makeDemographicSummary(),
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

// No-shows

export function makeNoShowSummary(
  overrides: Partial<Schema<"NoShowSummaryPublic">> = {},
): Schema<"NoShowSummaryPublic"> {
  return {
    expected: 80,
    no_show: 12,
    no_show_rate: 0.15,
    repeat_guests: 3,
    ...overrides,
  };
}

export function makeNoShowMeetupRow(
  overrides: Partial<Schema<"NoShowMeetupRowPublic">> = {},
): Schema<"NoShowMeetupRowPublic"> {
  return {
    meetup_id: "meetup-1",
    name: "Alter #27",
    date: "2026-04-04T23:00:00Z",
    expected: 40,
    no_show: 4,
    no_show_rate: 0.1,
    ...overrides,
  };
}

/** `expected` people of whom `no_show` did not come, with their rate. */
function noShowGroup<K>(key: K, expected: number, noShow: number) {
  return {
    key,
    expected,
    no_show: noShow,
    no_show_rate:
      expected === 0 ? null : Math.round((noShow / expected) * 10000) / 10000,
  };
}

export function makeNoShowGenderGroup(
  key: Schema<"NoShowGenderGroupPublic">["key"],
  expected: number,
  noShow: number,
): Schema<"NoShowGenderGroupPublic"> {
  return noShowGroup(key, expected, noShow);
}

export function makeNoShowAgeGroup(
  key: Schema<"NoShowAgeGroupPublic">["key"],
  expected: number,
  noShow: number,
): Schema<"NoShowAgeGroupPublic"> {
  return noShowGroup(key, expected, noShow);
}

export function makeNoShowHistoryGroup(
  key: Schema<"NoShowHistoryGroupPublic">["key"],
  expected: number,
  noShow: number,
): Schema<"NoShowHistoryGroupPublic"> {
  return noShowGroup(key, expected, noShow);
}

export function makeNoShowGuest(
  overrides: Partial<Schema<"NoShowGuestPublic">> = {},
): Schema<"NoShowGuestPublic"> {
  return {
    guest_id: "guest-1",
    displayname: "Luna",
    expected: 3,
    attended: 0,
    no_show: 3,
    last_no_show: "2026-04-18T23:00:00Z",
    ...overrides,
  };
}

const AGE_BUCKETS = [
  "AGE_18_24",
  "AGE_25_29",
  "AGE_30_34",
  "AGE_35_39",
  "AGE_40_49",
  "AGE_50_PLUS",
  "UNKNOWN",
] as const satisfies readonly Schema<"StatsAgeBucket">[];

const LEAD_BUCKETS = [
  "SAME_DAY",
  "ONE_DAY",
  "TWO_THREE",
  "FOUR_SEVEN",
  "EIGHT_FOURTEEN",
  "FIFTEEN_PLUS",
] as const satisfies readonly Schema<"StatsLeadTimeBucket">[];

/** 80 people expected over two events, 12 of whom did not come. */
export function makeNoShowStats(
  overrides: Partial<Schema<"NoShowStatsPublic">> = {},
): Schema<"NoShowStatsPublic"> {
  return {
    summary: makeNoShowSummary(),
    meetups: [
      makeNoShowMeetupRow(),
      makeNoShowMeetupRow({
        meetup_id: "meetup-2",
        name: "Alter #28",
        date: "2026-04-18T23:00:00Z",
        no_show: 8,
        no_show_rate: 0.2,
      }),
    ],
    gender: [
      makeNoShowGenderGroup("MALE", 50, 5),
      makeNoShowGenderGroup("NEW_CODE", 4, 2),
      makeNoShowGenderGroup(null, 26, 5),
    ],
    age: AGE_BUCKETS.map((b) =>
      b === "AGE_18_24"
        ? makeNoShowAgeGroup(b, 80, 12)
        : makeNoShowAgeGroup(b, 0, 0),
    ),
    history: [
      makeNoShowHistoryGroup("FIRST_TIME", 30, 9),
      makeNoShowHistoryGroup("RETURNING", 50, 3),
    ],
    lead_time: LEAD_BUCKETS.map((bucket) =>
      bucket === "SAME_DAY"
        ? makeLeadTimeRow({
            bucket,
            signed_up: 85,
            cancelled: 5,
            no_show: 12,
            no_show_rate: 0.15,
          })
        : makeLeadTimeRow({
            bucket,
            signed_up: 0,
            cancelled: 0,
            no_show: 0,
            no_show_rate: null,
          }),
    ),
    guests: [
      makeNoShowGuest(),
      makeNoShowGuest({
        guest_id: "guest-2",
        displayname: "Tomi",
        expected: 4,
        attended: 2,
        no_show: 2,
        last_no_show: "2026-04-04T23:00:00Z",
      }),
    ],
    guests_total: 2,
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

// Operations

export function makeOperationsSummary(
  overrides: Partial<Schema<"OperationsSummaryPublic">> = {},
): Schema<"OperationsSummaryPublic"> {
  return {
    attended: 300,
    paid_share: 0.9,
    avg_peak_checkins: 40,
    bans: 3,
    ...overrides,
  };
}

export function makePaymentStats(
  overrides: Partial<Schema<"OperationsPaymentStatsPublic">> = {},
): Schema<"OperationsPaymentStatsPublic"> {
  return {
    paying_events: 2,
    paid: 180,
    pending: 20,
    exempt: 100,
    cancelled_but_paid: 4,
    paid_share: 0.9,
    ...overrides,
  };
}

export function makeStaffCheckins(
  overrides: Partial<Schema<"StaffCheckinsPublic">> = {},
): Schema<"StaffCheckinsPublic"> {
  return { user_id: 1, username: "door", checkins: 200, ...overrides };
}

export function makeBusiestSlot(
  overrides: Partial<Schema<"BusiestSlotPublic">> = {},
): Schema<"BusiestSlotPublic"> {
  return {
    meetup_id: "meetup-1",
    meetup_name: "Alter Marzo",
    local_time: "23:15",
    checkins: 62,
    ...overrides,
  };
}

export function makeBanRow(
  overrides: Partial<Schema<"BanRowPublic">> = {},
): Schema<"BanRowPublic"> {
  return {
    guest_id: "guest-1",
    displayname: "Ana",
    reason: "Harassed another guest",
    timestamp: "2026-01-09T15:30:00Z",
    actor_username: "owner",
    ...overrides,
  };
}

export function makeGuestTypeRow(
  overrides: Partial<Schema<"GuestTypeRowPublic">> = {},
): Schema<"GuestTypeRowPublic"> {
  return { guest_type: "NORMAL", attended: 200, share: 0.6667, ...overrides };
}

export function makeOperationsStats(
  overrides: Partial<Schema<"OperationsStatsPublic">> = {},
): Schema<"OperationsStatsPublic"> {
  return {
    summary: makeOperationsSummary(),
    guest_types: [
      makeGuestTypeRow(),
      makeGuestTypeRow({ guest_type: "INVITED", attended: 50, share: 0.1667 }),
      makeGuestTypeRow({ guest_type: "STAFF", attended: 30, share: 0.1 }),
      makeGuestTypeRow({ guest_type: "VENDOR", attended: 20, share: 0.0667 }),
    ],
    payments: makePaymentStats(),
    staff: [
      makeStaffCheckins(),
      makeStaffCheckins({ user_id: 2, username: "owner", checkins: 70 }),
      makeStaffCheckins({ user_id: null, username: null, checkins: 30 }),
    ],
    busiest: makeBusiestSlot(),
    ban_list: [
      makeBanRow(),
      makeBanRow({
        guest_id: "guest-2",
        displayname: "Beto",
        reason: null,
        timestamp: "2025-12-20T15:00:00Z",
        actor_username: null,
      }),
    ],
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

// Retention

export function makeRetentionSummary(
  overrides: Partial<Schema<"RetentionSummaryPublic">> = {},
): Schema<"RetentionSummaryPublic"> {
  return {
    attendees: 120,
    new_guests: 49,
    came_back: 17,
    returning: 71,
    new_share: 0.4083,
    first_timer_return_rate: 0.35,
    ...overrides,
  };
}

/** The summary of a period or event nobody attended. */
export function makeEmptyRetentionSummary(): Schema<"RetentionSummaryPublic"> {
  return makeRetentionSummary({
    attendees: 0,
    new_guests: 0,
    came_back: 0,
    returning: 0,
    new_share: null,
    first_timer_return_rate: null,
  });
}

export function makeNewReturningRow(
  overrides: Partial<Schema<"MeetupNewReturningPublic">> = {},
): Schema<"MeetupNewReturningPublic"> {
  return {
    meetup_id: "meetup-1",
    name: "Alter Marzo",
    date: "2026-03-10T22:00:00Z",
    new: 20,
    returning: 40,
    ...overrides,
  };
}

export function makeCohortRow(
  overrides: Partial<Schema<"CohortRowPublic">> = {},
): Schema<"CohortRowPublic"> {
  return { month: "2026-02", size: 40, retention: [0.5, 0.25], ...overrides };
}

/** How many people came once, twice, 3 to 5 and 6 or more times. */
export function makeFrequencyRows(): Schema<"FrequencyRowPublic">[] {
  return [
    { bucket: "ONE", guests: 70 },
    { bucket: "TWO", guests: 30 },
    { bucket: "THREE_FIVE", guests: 15 },
    { bucket: "SIX_PLUS", guests: 5 },
  ];
}

export function makeLapsedRegular(
  overrides: Partial<Schema<"LapsedRegularPublic">> = {},
): Schema<"LapsedRegularPublic"> {
  return {
    guest_id: "guest-1",
    displayname: "Ana",
    attended_before: 7,
    last_attended: "2026-01-09T22:00:00Z",
    ...overrides,
  };
}

export function makeNightGuest(
  overrides: Partial<Schema<"NightGuestPublic">> = {},
): Schema<"NightGuestPublic"> {
  return {
    guest_id: "guest-1",
    displayname: "Ana",
    avatar_url: null,
    visit: 1,
    days_since_previous: null,
    came_back: false,
    ...overrides,
  };
}

export function makeAfterwardsMeetup(
  overrides: Partial<Schema<"AfterwardsMeetupPublic">> = {},
): Schema<"AfterwardsMeetupPublic"> {
  return {
    meetup_id: "meetup-2",
    name: "Alter Abril",
    date: "2026-04-04T22:00:00Z",
    guest_ids: [],
    ...overrides,
  };
}

/**
 * Five people: Ana a regular, Beto back after months, Caro on her second
 * visit and two first-timers, then three events after the night.
 */
export function makeRetentionNight(
  overrides: Partial<Schema<"RetentionNightPublic">> = {},
): Schema<"RetentionNightPublic"> {
  return {
    guests: [
      makeNightGuest({
        guest_id: "g-ana",
        displayname: "Ana",
        visit: 9,
        days_since_previous: 28,
        came_back: true,
      }),
      makeNightGuest({
        guest_id: "g-beto",
        displayname: "Beto",
        visit: 4,
        days_since_previous: 210,
      }),
      makeNightGuest({
        guest_id: "g-caro",
        displayname: "Caro",
        visit: 2,
        days_since_previous: 35,
      }),
      makeNightGuest({
        guest_id: "g-dani",
        displayname: "Dani",
        came_back: true,
      }),
      makeNightGuest({ guest_id: "g-eli", displayname: "Eli" }),
    ],
    afterwards: [
      makeAfterwardsMeetup({
        meetup_id: "m-apr",
        name: "Alter Abril",
        date: "2026-04-04T22:00:00Z",
        guest_ids: ["g-dani"],
      }),
      makeAfterwardsMeetup({
        meetup_id: "m-may",
        name: "Alter Mayo",
        date: "2026-05-09T22:00:00Z",
        guest_ids: ["g-ana", "g-dani"],
      }),
      makeAfterwardsMeetup({
        meetup_id: "m-jun",
        name: "Alter Junio",
        date: "2026-06-06T22:00:00Z",
        guest_ids: [],
      }),
    ],
    ...overrides,
  };
}

/** The retention of a period: no night, every period section filled. */
export function makeRetentionStats(
  overrides: Partial<Schema<"RetentionStatsPublic">> = {},
): Schema<"RetentionStatsPublic"> {
  return {
    summary: makeRetentionSummary(),
    meetups: [
      makeNewReturningRow(),
      makeNewReturningRow({
        meetup_id: "meetup-2",
        name: "Alter Abril",
        date: "2026-04-10T22:00:00Z",
        new: 0,
        returning: 0,
      }),
    ],
    cohorts: [
      makeCohortRow(),
      makeCohortRow({ month: "2026-03", size: 4, retention: [0.25] }),
    ],
    frequency: makeFrequencyRows(),
    lapsed: [
      makeLapsedRegular(),
      makeLapsedRegular({
        guest_id: "guest-2",
        displayname: "Beto",
        attended_before: 3,
        last_attended: "2025-12-19T22:00:00Z",
      }),
    ],
    lapsed_total: 5,
    comparison_kind: null,
    comparison: null,
    night: null,
    ...overrides,
  };
}

/** The retention of one event: its summary and its night, no period sections. */
export function makeEventRetentionStats(
  overrides: Partial<Schema<"RetentionStatsPublic">> = {},
): Schema<"RetentionStatsPublic"> {
  return makeRetentionStats({
    summary: makeRetentionSummary({
      attendees: 5,
      new_guests: 2,
      came_back: 1,
      returning: 3,
      new_share: 0.4,
      first_timer_return_rate: 0.5,
    }),
    meetups: [],
    cohorts: [],
    frequency: [],
    lapsed: [],
    lapsed_total: null,
    night: makeRetentionNight(),
    ...overrides,
  });
}

// Weather

export function makeWeatherMeetupRow(
  overrides: Partial<Schema<"WeatherMeetupRowPublic">> = {},
): Schema<"WeatherMeetupRowPublic"> {
  return {
    meetup_id: "meetup-1",
    name: "Alter Marzo",
    date: "2026-03-10T22:00:00Z",
    has_weather: true,
    attended: 100,
    no_show_rate: 0.2,
    avg_temperature: 18.2,
    before_avg_temperature: 21.6,
    rained: false,
    total_precipitation_mm: 0,
    ...overrides,
  };
}

export function makeTemperatureBand(
  overrides: Partial<Schema<"TemperatureBandRowPublic">> = {},
): Schema<"TemperatureBandRowPublic"> {
  return {
    band: "FROM_15_TO_20",
    events: 5,
    avg_attended: 95.5,
    no_show_rate: 0.25,
    ...overrides,
  };
}

/** The five bands in order; the 10 to 15° band had no events. */
export function makeTemperatureBands(): Schema<"TemperatureBandRowPublic">[] {
  return [
    makeTemperatureBand({
      band: "BELOW_10",
      events: 2,
      avg_attended: 70,
      no_show_rate: 0.4,
    }),
    makeTemperatureBand({
      band: "FROM_10_TO_15",
      events: 0,
      avg_attended: null,
      no_show_rate: null,
    }),
    makeTemperatureBand(),
    makeTemperatureBand({
      band: "FROM_20_TO_25",
      events: 6,
      avg_attended: 110,
      no_show_rate: 0.2,
    }),
    makeTemperatureBand({
      band: "FROM_25",
      events: 2,
      avg_attended: 60,
      no_show_rate: 0.5,
    }),
  ];
}

/** The weather row of a meetup (the 6 hours from its start). */
export function makeEventWeather(
  overrides: Partial<Schema<"MeetupWeatherPublic">> = {},
): Schema<"MeetupWeatherPublic"> {
  return {
    avg_temperature: 12,
    avg_apparent_temperature: 9,
    total_precipitation_mm: 0,
    max_wind_kmh: 12,
    rained: false,
    fetched_at: "2026-04-06T10:00:00Z",
    source: "open-meteo-historical-forecast",
    ...overrides,
  };
}

export function makeWeatherWindow(
  overrides: Partial<Schema<"WeatherWindowPublic">> = {},
): Schema<"WeatherWindowPublic"> {
  return {
    avg_temperature: 13,
    avg_apparent_temperature: 10,
    total_precipitation_mm: 4.1,
    rained: true,
    ...overrides,
  };
}

export function makeWeatherHour(
  overrides: Partial<Schema<"WeatherHourPublic">> = {},
): Schema<"WeatherHourPublic"> {
  return {
    time: "2026-04-05T22:00:00.000Z",
    offset_minutes: 0,
    temperature: 12,
    apparent_temperature: 9,
    precipitation_mm: 0,
    weather_code: 0,
    is_day: false,
    ...overrides,
  };
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * The stored hours of an event that starts at `start` (an ISO instant on the
 * hour): 3 hours before it through 5 after, rain at first, dry later.
 */
export function makeWeatherHours(
  start = "2026-04-05T22:00:00.000Z",
): Schema<"WeatherHourPublic">[] {
  const temps = [14, 13, 12, 12.5, 12, 11.5, 11, 10.5, 10];
  const feels = [11, 10, 9.5, 9.5, 9, 8.5, 8, 8, 7.5];
  const rain = [1.5, 2, 0.6, 0, 0, 0, 0, 0, 0];
  const codes = [63, 63, 51, 3, 2, 0, 0, 0, null];
  const first = new Date(start).getTime() - 3 * HOUR_MS;
  return temps.map((temperature, i) =>
    makeWeatherHour({
      time: new Date(first + i * HOUR_MS).toISOString(),
      offset_minutes: (i - 3) * 60,
      temperature,
      apparent_temperature: feels[i],
      precipitation_mm: rain[i],
      weather_code: codes[i],
    }),
  );
}

export function makeWeatherEvent(
  overrides: Partial<Schema<"WeatherEventPublic">> = {},
): Schema<"WeatherEventPublic"> {
  return {
    status: "OK",
    ready: true,
    weather: makeEventWeather(),
    before: makeWeatherWindow(),
    hours: makeWeatherHours(),
    ...overrides,
  };
}

/** The weather of a period: three events, one of them without weather. */
export function makeWeatherStats(
  overrides: Partial<Schema<"WeatherStatsPublic">> = {},
): Schema<"WeatherStatsPublic"> {
  return {
    event: null,
    meetups: [
      makeWeatherMeetupRow(),
      makeWeatherMeetupRow({
        meetup_id: "meetup-0",
        name: "Alter Febrero",
        date: "2026-02-10T22:00:00Z",
        attended: 90,
        avg_temperature: 25.4,
        before_avg_temperature: 27.1,
      }),
      makeWeatherMeetupRow({
        meetup_id: "meetup-2",
        name: "Alter Abril",
        date: "2026-04-02T22:00:00Z",
        has_weather: false,
        avg_temperature: null,
        before_avg_temperature: null,
        rained: null,
        total_precipitation_mm: null,
      }),
    ],
    temperature_bands: makeTemperatureBands(),
    temperature_bands_before: makeTemperatureBands().map((b) =>
      b.band === "BELOW_10"
        ? { ...b, events: 0, avg_attended: null, no_show_rate: null }
        : b.band === "FROM_10_TO_15"
          ? { ...b, events: 3, avg_attended: 84, no_show_rate: 0.3 }
          : b,
    ),
    comparison_kind: null,
    comparison: null,
    ...overrides,
  };
}

/** The weather response for one event: only `event`, no period rows. */
export function makeEventWeatherStats(
  event: Schema<"WeatherEventPublic"> = makeWeatherEvent(),
): Schema<"WeatherStatsPublic"> {
  return makeWeatherStats({
    event,
    meetups: [],
    temperature_bands: [],
    temperature_bands_before: [],
  });
}
