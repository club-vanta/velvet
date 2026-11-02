# Handoff: auth pages and app shell

Branch `worktree-agent-a293e92cfed4bb585`, based on 26a3b63.

## Done

- Shell.tsx went from 349 to 34 lines. It is split into TopBar, SidebarToggle, LanguageMenu,
  OrgSwitcher, LogoutButton, SidebarNav, BottomNav and PendingBadge, plus `navItems.ts`,
  `app/access.ts` (`canAccess`/`useViewer`, shared with the App.tsx route table),
  `usePendingStaffCount` and `useSidebarOpen`.
- The four auth pages share AuthLayout, AuthField, AuthError, AuthSuccess and AuthFooterLink.
  Their requests go through useLogin, useRegister, useVerifyRecoveryCode and useResetPassword
  mutations. Pure helpers are in `lib/recoveryState.ts` and `lib/password.ts`.
- New query key helpers `organizationsKey`, `staffRootKey` and `pendingStaffKey`.
- Every hardcoded string is now in i18n (sidebar toggle, Log/Orgs, app name, menus, badge).
- Bug fixes, each with a test:
  - Network errors are shown in the UI language (typed `NetworkError`).
  - An unknown stored language no longer crashes the app.
  - The 15-character minimum shows a translated message and counts code points.
  - The login token is dropped when /auth/userinfo fails after /auth/token.
- E2E specs: `cypress/e2e/auth/*` (login, signup, forgot-password, reset-password, logout),
  `cypress/e2e/app/*` (routes, session, org-switcher, sidebar, bottom-nav, pending-badge) and
  `cypress/e2e/i18n/*` (spanish, language-switch). Shared stubs are in
  `cypress/support/routes/{app,auth}.ts`.
- Component tests for every Shell part and auth page and component, plus input-with-prefix.
  The RTL tests for Login, ForgotPassword, ResetPassword, Shell and input-with-prefix were
  deleted after migrating them.

## Known failing or unverified

- The last full E2E run with retries=0 passed 80 of 81. `app/routes.cy.ts` "Routes for
  orgAdmin > opens every page of the nav" timed out waiting for the "Statistics" heading. The
  lazy stats chunk compiles on first load on a cold dev server (load average 18), and the test
  passed in earlier runs. Next step: give that one heading assertion a longer timeout, or warm
  /stats first.
- `npm run test:run` under heavy load: ReasonDialog.test.tsx (not changed by this branch)
  times out at 5s. It passed 705/705 in an earlier full run.
- The component tests were not re-run after the last two review-fix commits (11d642c,
  f43073d). They passed before those commits. Vitest, check and build were run after them.
- `npm run check` and `npm run build` are green.

## Requests outside this area

- StaffPage, DashboardPage and the Organizations pages still use the inline
  `["staff"]`, `["staff","pending"]` and `["organizations"]` keys. Switch them to the new
  helpers and share one pending-staff hook.
- Mutation toasts should keep showing `err.message`, which NetworkError already translates.
- The dashboard has a contrast failure: `text-muted-foreground/70` measures 4:1.

## How to verify

```bash
npm run check && npm run test:run && npm run build
npx vite --mode e2e --port 5305 --strictPort &
npx cypress run --e2e --browser /opt/pw-browsers/chromium --config baseUrl=http://localhost:5305,retries=0 \
  --spec "cypress/e2e/auth/**,cypress/e2e/app/**,cypress/e2e/i18n/**"
npx cypress run --component --browser /opt/pw-browsers/chromium --config retries=0 \
  --spec "src/app/**/*.cy.tsx,src/features/auth/**/*.cy.tsx,src/components/ui/*.cy.tsx"
```
