# Organization Statistics, Phase 6 (Ubicación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let org admins set each meetup's location with address autocomplete (Photon, free, no key), and show it to every org member, so phase 7 can fetch the weather there.

**Architecture:** Three nullable columns on `meetups`; a `PATCH .../location` endpoint; a `GET .../geocode` proxy over Photon in a small `app/services/geocoding.py` client (httpx, like `MazmoClient`). Velvet shows the location on the meetup page and, for org admins, an autocomplete field.

**Tech Stack:** as phase 1, plus httpx (already a dependency) and Alembic.

**Spec:** `docs/superpowers/specs/2026-10-24-org-statistics-design.md`, "Meetup location", "Access", and the Photon notes under "Approaches" and "Left to the builder".

## Global Constraints

- Phase 1-5 Global Constraints (single PR per repo, branches, local type generation, no em dashes, en/es strings, ASCII-only backend).
- Columns on `Meetup` / `meetups`: `location_label: str | None` (max 255), `latitude: float | None`, `longitude: float | None`. Migration `0023_meetup_location.py` (follow the naming and style of `alembic/versions/0022_*`), nullable, no backfill, reversible.
- The three are set or cleared **together**. Validation: either all null, or label 1..255 chars after trimming, latitude in [-90, 90], longitude in [-180, 180]. Otherwise 422 with a message in the repo's style.
- `PATCH /organizations/{org_id}/meetups/{meetup_id}/location` (org admin, `get_org_admin`), body `MeetupLocationUpdate {location_label, latitude, longitude}` (all required keys, nullable values), works on finalized meetups too, returns the updated `MeetupPublic`. 404 for a meetup outside the org (reuse the existing meetup-in-org lookup).
- `MeetupPublic` (and any other meetup response the velvet meetup page reads) gains the three fields, always present (no default), so any org member sees them.
- `GET /organizations/{org_id}/geocode?q=...` (org admin): `q` trimmed, 3..200 chars (422 otherwise). Calls `https://photon.komoot.io/api` with `q`, `limit=10`, `lat=-34.6037`, `lon=-58.3816` (Buenos Aires bias); keeps results whose `properties.countrycode` is `AR`; returns at most 5 `GeocodeResult {label: str, latitude: float, longitude: float}`. Label: the non-empty parts of `name`, `street` + `housenumber`, `district` or `locality`, `city`, `state`, joined with ", ", consecutive duplicates removed.
- The geocode client: `app/services/geocoding.py`, `class PhotonClient` mirroring `MazmoClient` (async context manager, shared `httpx.AsyncClient`, timeout 5s, a descriptive `User-Agent` naming the app, since Photon's fair use asks for one). Provider errors (timeout, non-2xx, bad JSON) -> `GeocodingUnavailableError`; the router maps it to 502 with a message saying the address search is unavailable and to try again or enter it later.
- Rate limit toward Photon: at most 1 request per second per process (an `asyncio.Lock` plus last-call timestamp in the client module; requests wait, they are not rejected). Document it in the module docstring.
- Velvet: the meetup page shows the location (label plus an "Abrir en el mapa" link to `https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=17/{lat}/{lon}`) to every member; org admins see an edit control: a text input with debounced autocomplete (300 ms, 3+ characters, at most one request in flight, results as a listbox navigable by keyboard), picking a result saves it via the PATCH, and a "Quitar ubicación" action clears it. Saving invalidates the meetup queries and `statsOrgKey`.

## Review Focus

1. **Photon down or slow** -> 502 from the proxy, velvet shows "No se pudo buscar la dirección" inline and the field stays usable; saving is unaffected. Tests in Task 2 and Task 4.
2. **Results outside Argentina** (same street name in Uruguay or Spain) -> filtered out. Test in Task 2.
3. **Typing fast** -> one request per 300 ms pause, stale responses never overwrite newer ones. Test in Task 4.
4. **Partial location in the PATCH body** (label without coordinates) -> 422. Test in Task 1.
5. **A STAFF member opens the meetup page** -> sees the address, no edit control. Test in Task 4.

---

## Part A: Backend

### Task 1: Location columns and PATCH endpoint

**Files:** `app/models/models.py` (Meetup fields), `alembic/versions/0023_meetup_location.py`, `app/schemas/meetups.py` (`MeetupLocationUpdate`, fields on `MeetupPublic`), `app/routers/meetups.py` (route + docstring list), `app/openapi_examples/meetups_examples.py`, `openapi.json`; tests `tests/test_meetup_location.py`.

- [ ] **Step 1: Failing tests:** set location (200, exact body fields); clear it (all null); 422 for partial body, label too long, latitude 91; 403 staff; 404 other org's meetup; works on a finalized meetup; `GET` of the meetup by a STAFF member includes the location.
- [ ] **Step 2:** fail. **Step 3:** implement; run `alembic upgrade head` and `alembic downgrade -1` then `upgrade head` against the dev DB to prove reversibility (record output). **Step 4:** pass, full gate. **Step 5: Commit** `feat: store a location on each meetup`

### Task 2: Geocode proxy

**Files:** create `app/services/geocoding.py`; add `GeocodeResult` schema and the route (where org-scoped utility routes fit best; `app/routers/meetups.py` or `app/routers/organizations.py`, follow the docstring route list convention); examples; `openapi.json`; tests `tests/test_geocoding.py`.

- [ ] **Step 1: Failing tests** (patch `httpx.AsyncClient.get` like `tests/test_mazmo.py`): label building from a full and a sparse Photon feature; non-AR features dropped; capped at 5; timeout -> 502 with the exact detail; `q` of 2 chars -> 422; 403 staff; the rate limiter makes a second call wait (patch the clock or assert the lock path; keep the test fast).
- [ ] **Step 2:** fail. **Step 3:** implement. **Step 4:** pass, full gate. **Step 5: Commit** `feat: add an address search proxy over Photon`

---

## Part B: Velvet

### Task 3: Types, keys, hooks

- Generate types from the local contract. Add `useGeocode(orgId, q)` (TanStack Query, `enabled` when `q.trim().length >= 3`, key under a `geocodeKey`, `staleTime` 5 minutes, debounced input lives in the component) and `useSetMeetupLocation(orgId, meetupId)` mutation invalidating the meetup detail/list keys and `statsOrgKey`. Tests for the invalidation calls. **Commit** `feat: add location and geocode hooks`

### Task 4: Location on the meetup page

**Files:** create `src/features/meetups/MeetupLocation.tsx` (+ test); modify the meetup detail page where the header facts live (reuse `FactStrip` if the address fits there), `src/lib/i18n.tsx`.

- i18n (en / es): `meetupLocation` "Location" / "Ubicación"; `meetupLocationNone` "No location yet" / "Sin ubicación"; `meetupLocationSearch` "Search an address" / "Buscar una dirección"; `meetupLocationOpenMap` "Open in map" / "Abrir en el mapa"; `meetupLocationRemove` "Remove location" / "Quitar ubicación"; `meetupLocationSearchFailed` "Could not search the address. Try again." / "No se pudo buscar la dirección. Probá de nuevo."; `meetupLocationNoResults` "No addresses found" / "No se encontraron direcciones"; `meetupLocationSaved` "Location saved" / "Ubicación guardada".
- A `StatsNote`-style hint is not needed here; a short helper text under the input: `meetupLocationHint` "Used for the weather in the statistics." / "Se usa para el clima en las estadísticas.".
- [ ] **Step 1: Failing tests:** member sees label + map link, no edit; admin types "Av. Corrientes" and after 300 ms one request is made; typing more cancels/ignores the stale response; arrow keys + Enter pick a result and call the PATCH with its exact values; "Quitar ubicación" sends nulls; geocode error shows the message; no results message.
- [ ] **Step 2:** fail. **Step 3:** implement (accessible combobox: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; reuse an existing shadcn primitive if the repo has a command/combobox component). **Step 4:** gates. **Step 5: Commit** `feat: set and show the meetup location`

### Task 5: Gate and browser check

- [ ] All gates. Browser check against the demo backend: type a real Buenos Aires address (this calls the public Photon instance from the local backend; a handful of requests is within fair use), pick it, see it saved, open the map link; 375px and 1280px, light and dark.
