# RTL to Cypress migration map

Every React Testing Library test deleted on this branch, by file. A title
with a target was found word for word in that spec. The others were
rewritten in the new tests' words, in the specs named under each file. For
meetups and guests every rewritten title was checked by hand against the new
tests during the final verification. For stats, auth, the shell and the
admin pages, the agent that deleted the file reported the mapping.

## `src/auth/ForgotPasswordPage.test.tsx`

Rewritten titles live in `cypress/e2e/auth/*`, `src/features/auth/**/*.cy.tsx`, `src/features/auth/lib/*.test.ts`.

- renders title, username field, code field, verify button, and back-to-login link (rewritten)
- code field has inputMode=numeric and maxLength=6 (rewritten)
- shows 'Verificando…' while the request is in flight (rewritten)
- navigates to /reset-password with username and code in state on success (rewritten)
- api is called with the correct path and body (rewritten)
- shows the API error message on failure (FastAPI detail string) (rewritten)
- shows fallback error when API returns unknown error shape (rewritten)
- shows generic error when the fetch itself throws (network error) (rewritten)
- clears error between attempts (rewritten)

## `src/auth/LoginPage.test.tsx`

Rewritten titles live in `cypress/e2e/auth/*`, `src/features/auth/**/*.cy.tsx`, `src/features/auth/lib/*.test.ts`.

- renders the forgot-password link (rewritten)
- forgot-password link is visible alongside the sign-up link (rewritten)

## `src/auth/ResetPasswordPage.test.tsx`

Rewritten titles live in `cypress/e2e/auth/*`, `src/features/auth/**/*.cy.tsx`, `src/features/auth/lib/*.test.ts`.

- redirects to / immediately when location.state is null (rewritten)
- redirects to / when state is missing username (rewritten)
- redirects to / when state is missing code (rewritten)
- renders the new-password field and set-password button (rewritten)
- password field type is 'password' by default (rewritten)
- toggle button shows and hides password (rewritten)
- password field enforces minLength=15 (rewritten)
- shows 'Guardando…' while the request is in flight (rewritten)
- calls api with correct path and body (rewritten)
- shows congratulations message with username after success (rewritten)
- back-to-login button navigates to / after success (rewritten)
- shows API error detail on failure (rewritten)
- shows generic error when fetch throws (rewritten)

## `src/components/GuestAvatar.test.tsx`

Rewritten titles live in the component spec next to it (`src/components/**/*.cy.tsx`) and the E2E specs of the pages that use it.

- renders initials when there is no avatar (rewritten)
- uses one initial for a single-word name → `src/components/GuestAvatar.cy.tsx`
- keeps an emoji at the start of a name whole → `src/components/GuestAvatar.cy.tsx`
- falls back to initials when the image fails to load (rewritten)
- tries again when the avatar URL changes → `src/components/GuestAvatar.cy.tsx`
- is exposed as an image when given alt text → `src/components/GuestAvatar.cy.tsx`

## `src/components/ReasonDialog.test.tsx`

Rewritten titles live in the component spec next to it (`src/components/**/*.cy.tsx`) and the E2E specs of the pages that use it.

- keeps the confirm button disabled below 5 characters (rewritten)
- enables the confirm button at exactly 5 characters (rewritten)
- disables the confirm button again above 500 characters (rewritten)
- calls onConfirm with the trimmed reason (rewritten)
- does not satisfy the minimum with whitespace-only input (rewritten)

## `src/components/StatCard.test.tsx`

Rewritten titles live in the component spec next to it (`src/components/**/*.cy.tsx`) and the E2E specs of the pages that use it.

- is named by its heading when the heading has an id → `src/components/StatCard.cy.tsx`
- is named by its title without a heading id → `src/components/StatCard.cy.tsx`

## `src/components/ui/input-with-prefix.test.tsx`

Rewritten titles live in the component spec next to it (`src/components/**/*.cy.tsx`) and the E2E specs of the pages that use it.

- renders the prefix text (rewritten)
- renders the input with the given placeholder (rewritten)
- the prefix element is not an input — it cannot be typed into (rewritten)
- forwards value and onChange to the input (rewritten)
- forwards the disabled prop to the input (rewritten)
- applies aria-invalid to the wrapper (rewritten)

## `src/features/events/EventsPage.test.tsx`

Rewritten titles live in `cypress/e2e/events/audit-log.cy.ts`, `src/features/events/lib/eventTypes.test.ts`.

- labels a guest type change and makes its reason readable (rewritten)
- keeps an unrecognized reason as-is (rewritten)
- links the guest name to the guest profile (rewritten)

## `src/features/guests/GuestBan.test.tsx`

Rewritten titles live in `cypress/e2e/guests/*`, `src/features/guests/**/*.cy.tsx`, `src/features/guests/api/*.test.ts`.

- invalidates the org stats after banning a guest (rewritten)
- invalidates the org stats after unbanning a guest (rewritten)

## `src/features/guests/GuestDetailPage.test.tsx`

Rewritten titles live in `cypress/e2e/guests/*`, `src/features/guests/**/*.cy.tsx`, `src/features/guests/api/*.test.ts`.

- shows the guest's meetups as a page section (rewritten)
- offers edit, link, and vant to an org admin (rewritten)
- offers unvant instead of vant for a vanted guest (rewritten)
- never offers vant or unvant to non-admin staff (rewritten)
- offers neither vant nor unvant until the vanted list has loaded (rewritten)
- says so when the vant status could not be checked (rewritten)

## `src/features/guests/GuestMeetups.test.tsx`

Rewritten titles live in `cypress/e2e/guests/*`, `src/features/guests/**/*.cy.tsx`, `src/features/guests/api/*.test.ts`.

- asks the org-scoped endpoint for this guest (rewritten)
- renders each meetup with its status label, newest first (rewritten)
- links each meetup to its page → `src/features/guests/components/GuestMeetups.cy.tsx`
- does not link the meetup the page is already on, and marks it → `src/features/guests/components/GuestMeetups.cy.tsx`
- shows the guest type badge only when it is not NORMAL (rewritten)
- says a walk-in did not sign up, and shows arrival only when present → `src/features/guests/components/GuestMeetups.cy.tsx`
- summary counts each status and shows walk-ins inside attended (rewritten)
- summary uses the Spanish labels, with Discreto for walk-ins (rewritten)
- summary hides zero counts (rewritten)
- shows the empty state → `src/features/guests/components/GuestMeetups.cy.tsx`
- shows retry when meetups fail, and recovers → `src/features/guests/components/GuestMeetups.cy.tsx`
- renders nothing and does not query without an org → `src/features/guests/components/GuestMeetups.cy.tsx`

## `src/features/guests/GuestProfile.test.tsx`

Rewritten titles live in `cypress/e2e/guests/*`, `src/features/guests/**/*.cy.tsx`, `src/features/guests/api/*.test.ts`.

- shows identity and Mazmo profile details → `src/features/guests/components/GuestProfile.cy.tsx`
- shows the meetups section for the active org (rewritten)
- lists the name history newest first, with source and actor (rewritten)
- explains a linked guest whose Mazmo data is not synced yet (rewritten)
- explains a guest with no Mazmo account → `cypress/e2e/guests/guest-profile.cy.ts`
- shows the org vant with its reason → `cypress/e2e/guests/guest-profile.cy.ts`
- calls out Mazmo's own ban as separate from org vants → `src/features/guests/components/GuestProfile.cy.tsx`
- marks a deleted Mazmo account and drops the dead profile link (rewritten)
- shows a not-found state for an unknown guest → `src/features/guests/components/GuestProfile.cy.tsx`

## `src/features/guests/GuestsPage.test.tsx`

Rewritten titles live in `cypress/e2e/guests/*`, `src/features/guests/**/*.cy.tsx`, `src/features/guests/api/*.test.ts`.

- creates a manual guest without a Mazmo handle (rewritten)
- creates a guest by Mazmo handle from the default tab (rewritten)
- offers Link Mazmo account for a guest with no handle, never Unlink (rewritten)
- offers Unlink Mazmo account for a linked guest, never Link (rewritten)
- shows Edit and Link/Unlink but never Ban for non-admin staff (rewritten)
- renders 'No Mazmo account' instead of a blank or @null handle (rewritten)
- omits instagram_username from the edit request when it wasn't changed (rewritten)
- sends an explicit null when instagram_username is cleared (rewritten)
- filters the loaded list in the browser, without a request per keystroke → `cypress/e2e/guests/directory-search.cy.ts`
- matches %s (rewritten)
- keeps the search input visible when a search matches nothing, so it can be cleared (rewritten)
- renders a long list a page at a time, and a new search starts from the top (rewritten)
- marks guests vanted in this org, and only them (rewritten)
- marks guests whose Mazmo account was deleted (rewritten)
- offers Unvant instead of Vant and disables Unlink for a vanted guest (rewritten)
- lists guests alphabetically, decorated names under their letter (rewritten)
- sorts by Mazmo ID with unlinked guests last → `cypress/e2e/guests/directory-sort.cy.ts`
- filters to guests without a Mazmo account (rewritten)
- refreshes every guest and reports the count (rewritten)
- mentions guests Mazmo didn't return (rewritten)
- shows the unreachable message when Mazmo times out (rewritten)

## `src/features/meetups/FinalizeMeetupDialog.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- refreshes the org stats when finalizing a meetup (rewritten)
- refreshes the org stats when reopening a meetup (rewritten)
- refreshes nothing when the request fails (rewritten)
- refreshes the meetup's guest list, where pending RSVPs become no-shows (rewritten)

## `src/features/meetups/GuestStatusLine.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- renders the sentence and the action (rewritten)
- hides the icon from assistive tech → `src/features/meetups/components/GuestStatusLine.cy.tsx`
- exposes its id for aria-describedby (rewritten)

## `src/features/meetups/MeetupDetailPage.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- disables check-in for an unpaid guest on a paid meetup (rewritten)
- enables check-in once the guest has paid (rewritten)
- disables check-in for staff too, and hides the mark paid button (rewritten)
- does not render the payment column for a free meetup (rewritten)
- does not open the banned-override dialog for a guest who is both banned and unpaid (rewritten)
- hides the toggle from non-admin staff (rewritten)
- shows "Disable payment" for an admin when the meetup already requires payment (rewritten)
- shows "Enable payment" for an admin when the meetup does not require payment (rewritten)
- renders 'No Mazmo account' for a guest with no Mazmo handle (rewritten)
- sends guest_id (not mazmo_user_id) to the checkin endpoint (rewritten)
- lets an unpaid %s guest check in on a paid meetup (rewritten)
- still blocks an unpaid regular guest (rewritten)
- shows the guest type badge, and none for regular guests (rewritten)
- keeps Undo payment for an exempt guest who had already paid (rewritten)
- sends the picked guest type to the type endpoint (rewritten)
- does not call the API when the current type is picked again (rewritten)
- hides guest type options from non-admin staff (rewritten)
- disables guest type options on a finalized meetup (rewritten)
- renders the grouped counts from the stats endpoint (rewritten)
- hides the payment card on a free meetup (rewritten)
- shows Mazmo's own flags apart from the org vant badge (rewritten)
- opens the guest profile sheet when the name is clicked (rewritten)
- lists guests alphabetically by default (rewritten)
- sorts from the toolbar and from the column headers (rewritten)
- filters by status and clears the filter from its chip (rewritten)
- filters guests who still owe payment on a paid meetup (rewritten)
- keeps guests with the same RSVP time in a stable order (rewritten)
- renders one card per guest instead of the table (rewritten)
- shows check-in and payment as one line each, with their undos (rewritten)
- tints the undos with their line so they stay readable (rewritten)
- says why a %s guest pays no fee, with no fee to collect (rewritten)
- opens the undo dialog from the check-in line (rewritten)
- shows no check-in line for a guest who has not arrived (rewritten)
- moves the arrival order out of the header (rewritten)
- leaves the order pill out when the arrival order is unknown → `cypress/e2e/meetups/check-in.cy.ts`
- explains a blocked check-in with the unpaid line (rewritten)
- shows no unpaid line while the meetup is loading → `cypress/e2e/meetups/payments.cy.ts`
- keeps the paid line for a guest paid before becoming exempt (rewritten)
- hides undo payment from non-admins (rewritten)
- keeps the unpaid line and drops the steps band once finalized (rewritten)
- marks the meetup finalized and blocks actions the backend refuses (rewritten)
- finalizes the meetup after confirming, with the attendance summary (rewritten)
- reopens a finalized meetup → `cypress/e2e/meetups/finalize.cy.ts`
- hides finalize from non-admin staff (rewritten)
- keeps the corrections the backend allows after finalizing (rewritten)
- marks a cancelled RSVP with a label, not only with opacity (rewritten)
- shows the row's vant while the org's vanted list is still loading (rewritten)
- searches the directory the same way as the Guests page (rewritten)
- lets an org admin change and remove the location, with the search closed (rewritten)
- offers the address search to an org admin when no location is set (rewritten)
- shows staff the address and map link but no edit control (rewritten)
- says there is no location to staff when none is set (rewritten)
- shows the weather card with a refresh for an org admin (rewritten)
- shows staff the weather card without a refresh (rewritten)
- clears a half-typed address search when the route moves to another meetup (rewritten)
- shows why the guest was vanted (rewritten)
- leaves out the author when the ban has none (rewritten)
- says no reason is recorded when the guest is not on the list → `src/features/meetups/components/BanReason.cy.tsx`
- keeps the choice open while the reason loads → `cypress/e2e/meetups/check-in.cy.ts`
- says so when the reason can't be loaded (rewritten)

## `src/features/meetups/MeetupLocation.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- shows the label and a map link, with no edit control, to a member (rewritten)
- says there is no location to a member when none is set (rewritten)
- makes one request after a 300 ms pause in typing (rewritten)
- does not search or show a list below 3 characters → `src/features/meetups/components/AddressSearch.cy.tsx`
- hides the previous results when the input shrinks under 3 characters → `src/features/meetups/components/AddressSearch.cy.tsx`
- never shows a late response for an old query (rewritten)
- picks a result with arrow keys and Enter and saves its exact values (rewritten)
- wraps the active option and closes the list on Escape (rewritten)
- saves a result picked with the mouse (rewritten)
- sends nulls from Remove location (rewritten)
- offers no removal when there is no location (rewritten)
- falls back to the generic message and keeps the field usable (rewritten)
- says when no addresses are found (rewritten)
- reports a failed save through a toast (rewritten)
- shows the backend message when the address search fails with %i (rewritten)
- marks the list busy while the next search loads → `src/features/meetups/components/AddressSearch.cy.tsx`
- wraps from the last option back to the first (rewritten)
- resets the highlighted option when the results change → `src/features/meetups/components/AddressSearch.cy.tsx`
- keeps focus and ignores a second pick while saving → `src/features/meetups/components/MeetupLocation.cy.tsx`
- returns focus to the search after removing the location (rewritten)
- hides the search while a location is set and offers to change it (rewritten)
- opens the search focused on Change location and closes it on Cancel (rewritten)
- cancels the change with Escape once the list is closed → `src/features/meetups/components/MeetupLocation.cy.tsx`
- saves a new location and moves focus to Change location (rewritten)
- moves focus to Change location when the same address is saved again → `src/features/meetups/components/MeetupLocation.cy.tsx`
- offers no change action to a member (rewritten)

## `src/features/meetups/MeetupWeather.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- titles the card with a level 2 heading (rewritten)
- requests the weather of the meetup (rewritten)
- shows each value with one decimal and its unit → `cypress/e2e/meetups/weather.cy.ts`
- formats numbers with the Spanish separator → `src/features/meetups/components/MeetupWeather.cy.tsx`
- says it did not rain → `src/features/meetups/components/MeetupWeather.cy.tsx`
- shows No data for every null value (rewritten)
- shows the amount when only the verdict is unknown (rewritten)
- cites the data source (rewritten)
- shows the reason instead of values → `src/features/meetups/components/MeetupWeather.cy.tsx`
- shows a busy, labelled placeholder before the data arrives → `src/features/meetups/components/MeetupWeather.cy.tsx`
- tells staff that an admin sets the location → `cypress/e2e/meetups/weather.cy.ts`
- keeps showing the data when a background refetch fails → `src/features/meetups/components/MeetupWeather.cy.tsx`
- shows an error with a retry that loads again → `src/features/meetups/components/MeetupWeather.cy.tsx`
- is offered to admins when %s (rewritten)
- is hidden to admins when %s (rewritten)
- is never offered to staff (rewritten)
- posts the refresh, then toasts and invalidates the weather and the stats (rewritten)
- is busy and inert while refreshing, and keeps focus → `src/features/meetups/components/WeatherRefreshButton.cy.tsx`
- falls back to a generic message when the error has no detail → `src/features/meetups/api/useGeocode.test.tsx`

## `src/features/meetups/MeetupsPage.test.tsx`

Rewritten titles live in `cypress/e2e/meetups/*`, `src/features/meetups/**/*.cy.tsx`, `src/features/meetups/lib/*.test.ts`, `src/features/meetups/api/meetupMutations.test.tsx`.

- sends requires_payment: true when the checkbox is checked (rewritten)
- groups meetups into today-and-upcoming and past (rewritten)
- shows one flat list once a sort is picked (rewritten)
- opens the new meetup dialog when linked with ?new=1 (rewritten)

## `src/features/staff/RecoveryCodeDialog.test.tsx`

Rewritten titles live in `cypress/e2e/staff/*`, `src/features/staff/**/*.cy.tsx`.

- each staff row has a 'Olvidó su contraseña' button (rewritten)
- clicking the button opens the confirmation dialog for that user (rewritten)
- Cancel button closes the dialog (rewritten)
- confirmation dialog shows the username and warning text (rewritten)
- clicking 'Generar código' calls POST /staff/{user_id}/recovery-code and shows the code (rewritten)
- shows 'Generando…' while the request is in flight (rewritten)
- generated code is rendered in a monospace element (rewritten)
- Copy button writes code to clipboard and temporarily shows 'Copiado!' (rewritten)
- API error on generate closes dialog and shows toast (rewritten)

## `src/features/stats/ArrivalsTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when nobody arrived and nobody signed up → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows exact headline values in aggregate mode (rewritten)
- says when a time falls before or right at the start → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- uses clock times and the period average for one event → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows dashes and says nobody checked in when there are no arrivals → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- heads the English lead-time table like its tooltip series → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- names the lead-time table after its card (rewritten)
- shows n under the first-hour share when few people arrived → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- lists the lead times in a table with exact counts and dims small rates (rewritten)
- says there were no sign-ups instead of drawing an empty lead-time chart → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- explains what the numbers leave out → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- says how many check-ins were left out of the curve → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- reads right in English for a single left-out check-in → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows no left-out note when nothing was excluded (rewritten)
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)
- lists the arrival curve by clock time by default → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- switches the curve to the time from the start → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- keeps the curve view in the URL (rewritten)
- falls back to clock time for an unknown curve view → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- labels one event's curve by clock time, without the several-events note → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows one event's curve from the start in that view → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`

## `src/features/stats/AttendanceTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- explains what the numbers leave out → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the error with retry, and "Ver todos los eventos" when an event is selected (rewritten)
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- offers no way back to all events on an error without a selected event (rewritten)
- shows the empty state for a period without finalized events → `src/features/stats/tabs/attendance/AttendanceTab.cy.tsx`
- shows exact headline values in aggregate mode (rewritten)
- compares a single event with the period average (rewritten)
- dims a rate computed from fewer than 10 people and shows n → `src/features/stats/tabs/attendance/AttendanceTab.cy.tsx`
- shows a dash for null rates (rewritten)
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching or showing cached numbers while the query is null (rewritten)
- lists the chart's numbers in a text table, in date order → `src/features/stats/tabs/attendance/AttendanceTab.cy.tsx`

## `src/features/stats/CohortTable.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- is named by its heading and has a column per month after the first → `src/features/stats/tabs/retention/CohortTable.cy.tsx`
- labels each row by its month and shows its size and shares → `src/features/stats/tabs/retention/CohortTable.cy.tsx`
- tints each share by its value, capped so the text keeps its contrast → `src/features/stats/tabs/retention/CohortTable.cy.tsx`
- dims a cohort of fewer than 10 people without a tint, its size already in the Personas column (rewritten)
- keeps the month column in view while the shares scroll sideways → `src/features/stats/tabs/retention/CohortTable.cy.tsx`
- formats the cohort size for the locale → `src/features/stats/tabs/retention/CohortTable.cy.tsx`

## `src/features/stats/DemographicsTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when there are no audience RSVPs → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`
- shows exact headline values and compares with the previous period (rewritten)
- compares one event with the period without comparing the counts → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`
- names the known-age card in English → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`
- shows n under the known-age share when few people attended → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`
- explains how gender and age are read → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)
- lists each group's share of the attendances in text tables, with Mazmo labels and unknown codes raw (rewritten)
- shows no expected or no-show figures → `src/features/stats/tabs/demographics/DemographicsTab.cy.tsx`

## `src/features/stats/MeteogramTooltip.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows the hovered hour and each value with its name → `src/features/stats/tabs/weather/MeteogramTooltip.cy.tsx`
- shows nothing when no point is hovered → `src/features/stats/tabs/weather/MeteogramTooltip.cy.tsx`

## `src/features/stats/NoShowsTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when nobody was expected → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- shows exact headline values and compares with the previous period (rewritten)
- compares one event with the period rate only → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- leaves out the period average when the period has no rate → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- shows n under the rate when few people were expected → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- lists the rate of each event in a text table → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- draws a rate bar per group, dimming and counting small groups (rewritten)
- draws each bar as long as its rate and none for a missing rate → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- shows each group's rate by default → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- switches every breakdown card to the share of no-shows → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- does not dim small groups in share mode (rewritten)
- keeps the view in the URL (rewritten)
- falls back to rates for an unknown view → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- shows no share when nobody missed → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- rates the lead time over the sign-ups that were not cancelled (rewritten)
- lists the guests who missed with a dot per sign-up and a link to each → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- caps the dots and counts the rest → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- says how many more guests the list leaves out → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- says when nobody missed twice in the period → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- says when everyone came to the one event → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- explains what counts as not coming → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- names the cards in English → `src/features/stats/tabs/no-shows/NoShowsTab.cy.tsx`
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)

## `src/features/stats/OperationsTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when nobody came in → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- shows exact headline values and compares with the previous period (rewritten)
- formats the counts for the locale → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- dims the paid share with n when few people owed entry → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- shows a dash and no n when nobody owed entry → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- shows dashes for the peak when there is no busiest slot (rewritten)
- hides the paid headline and the payments card without paying events → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- compares one event with the period average, except the totals → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- shows the period average peak with one decimal even when it is whole → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- lists every guest type in order with its count and share → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- shows the payment counts and the cancelled-after-paying line → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- leaves out the cancelled-after-paying line when nobody did → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- lists the check-ins per staff member, with one row for no recorded checker → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- lists the bans with dashes for a missing reason or actor, linked to the guest (rewritten)
- says how many more bans there are than listed → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- leaves out the bans card when there are none → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- explains who is counted and what pending means → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)

## `src/features/stats/RetentionTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when nobody attended in the period → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows the empty state when nobody attended the event → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows exact headline values and compares with the previous period (rewritten)
- formats the counts for the locale → `src/features/stats/tabs/operations/OperationsTab.cy.tsx`
- dims the return rate with n when there were few first-timers → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows dashes and no n when nobody came for the first time → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows the aggregate sections for a period (rewritten)
- gives the charts text alternatives for screen readers (rewritten)
- shows the night instead of the period sections for one event (rewritten)
- counts the regulars of the night instead of the people → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- draws one face per person by visits, marking who came back → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows who a face is on hover → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- keeps a tapped face's card open until a tap lands elsewhere (rewritten)
- closes an open card when the event changes → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows who of the night came to each next event → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows a face's card in the next events too → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- keeps one card open when faces of both cards are tapped → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- says when everyone from the night came to a later event → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- says when no event came after the night yet → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- leaves out the first-timers subline when the event had no first-timers → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- names the cohort table after its card and scrolls only the table → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- links each lapsed regular to their guest page → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- leaves out the more line when every lapsed regular is shown → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- says nobody stopped coming when the period has a start and no lapsed regulars → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- leaves out the lapsed list for a period without a start → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- shows who came only once instead of first times over all time → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- keeps first times for one event over all time → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- keeps first times for a period with bounds → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- explains first times, the return rate, cohorts and lapsed regulars → `src/features/stats/tabs/retention/RetentionTab.cy.tsx`
- explains first times and the return rate for one event (rewritten)
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)

## `src/features/stats/StatsPage.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- scrolls the selected tab into view on load (rewritten)
- scrolls a newly selected tab into view (rewritten)
- hides the scrollbar of the strip (rewritten)
- renders the default period "Últimos 3 meses" and "Todos los eventos" (rewritten)
- choosing "Este año" writes range=ytd to the URL (rewritten)
- falls back to the default for an invalid range (rewritten)
- falls back to the default for a bad custom range: %s (rewritten)
- only offers finalized meetups inside the range, as name and dd/mm (rewritten)
- writes meetup=<id> for an event and removes it for all events (rewritten)
- drops the selected event when the period changes → `cypress/e2e/stats/filters.cy.ts`
- seeds the custom range with the current period, end inclusive (rewritten)
- seeds the last 3 months when switching from "all" to custom (rewritten)
- ties the date inputs together so from cannot pass to (rewritten)
- picking a custom date updates the URL and keeps the other params (rewritten)
- names the custom period in the line comparing one event (rewritten)
- removes a meetup param that is not an offered event (rewritten)
- treats an empty meetup param as no event (rewritten)
- names the selects by label and visible value (rewritten)
- undoes a picked event with the browser back button (rewritten)
- keeps the selected event when the meetups fail to load (rewritten)
- selects Horarios for tab=arrivals (rewritten)
- falls back to Asistencia for an unknown tab (rewritten)
- writes the tab to the URL and Back returns to Asistencia (rewritten)
- does not request the arrivals of a hidden tab (rewritten)
- requests only the demographics of tab=demographics (rewritten)
- requests only the retention of tab=retention (rewritten)
- requests only the operations of tab=operations (rewritten)
- requests only the weather of tab=weather (rewritten)
- does not request the attendance of a hidden tab (rewritten)
- replaces the history entry for each custom date pick (rewritten)
- moves the other date along when a custom range would turn around (rewritten)
- labels a late event with its local day (rewritten)

## `src/features/stats/WeatherTab.test.tsx`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- shows a skeleton while loading → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- announces the error and retries the request → `src/features/stats/tabs/arrivals/ArrivalsTab.cy.tsx`
- shows the empty state when the period has no finalized events → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- shows only the two temperature charts, without headline cards → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- lists the five bands in order with events, average and no-show → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- explains the scatter is too thin with fewer than two points → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- charts the scatter and lists its points in date order → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- starts on the temperature during the event → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- switches both charts to the temperature before the start → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- opens on the before temperature from the URL → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- defines a color for every series the charts paint → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- explains the windows and the sample in the aggregate (rewritten)
- shows the weather before and during the event, not its attendance → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- says there is no data for a window the provider left empty → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- lists every hour with its weather and the arrivals in it (rewritten)
- leaves the icons to the text table for screen readers (rewritten)
- splits the windows at the start hour for a start at half past → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- lets the keyboard reach the scrolling chart → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- asks the arrivals for the same event → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- keeps the weather when the arrivals fail → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- titles each strip with what its numbers measure (rewritten)
- names the shaded hours before the start in the legend (rewritten)
- says it did not rain instead of drawing an empty rain strip → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- draws the rain strip when it rained (rewritten)
- says when nobody arrived in the charted hours → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- zooms the hourly chart in and out, wider per hour → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- shows a placeholder for the arrivals while they load → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- says why %s has no weather (rewritten)
- tells %s to set the location (rewritten)
- cites the source and the hours it covers → `src/features/stats/tabs/weather/WeatherTab.cy.tsx`
- sends from, to and meetup_id to the API (rewritten)
- waits without fetching while the query is null (rewritten)

## `src/features/stats/noShowShare.test.ts`

Rewritten titles live in `cypress/e2e/stats/*`, `src/features/stats/**/*.cy.tsx`, `src/features/stats/lib/*.test.ts`.

- splits the no-shows by group (rewritten)
- adds up to one (rewritten)
- has no share without no-shows (rewritten)

## `src/layout/Shell.test.tsx`

Rewritten titles live in `cypress/e2e/app/*`, `src/app/layout/**/*.cy.tsx`.

- hides the Estadísticas link from org staff (rewritten)
- shows the Estadísticas link to org admins (rewritten)
- keeps each bottom-nav label inside its own slot on narrow phones (rewritten)

## `src/lib/org.test.tsx`

Rewritten titles live in `src/domain/session/OrgContext.test.tsx`, `cypress/e2e/app/org-switcher.cy.ts`.

- is true for an admin of the active org → `src/domain/session/OrgContext.test.tsx`
- is false for a plain member of the active org → `src/domain/session/OrgContext.test.tsx`
- is true for a site admin → `src/domain/session/OrgContext.test.tsx`
- throws like useOrg → `src/domain/session/OrgContext.test.tsx`
