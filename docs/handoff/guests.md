# Handoff: guests

Written by the orchestrator: the guests agent hit the usage limit during its
final verification, so this note comes from its commit log.

## Done (merged from `worktree-agent-a233c32aad555f759`)

- Refactor: GuestsPage, GuestProfile and GuestDialogs split into
  `components/`, `hooks/` and `api/` (`f233e97`).
- Bug fixes with tests: a disabled Unlink is explained (aria-describedby) and
  waits for the vant status (`1da1b4b`); the vant reason is sent trimmed through
  the shared ReasonDialog (`a67b36b`); a list that failed to load is no longer
  called empty (`fd2b31e`).
- E2E: guest directory (`39f9b75`); adding, editing, linking, vanting and
  roles (`16abc48`).
- Vitest: directory view, labels and request helpers (`40a2016`).
- Cypress CT: shared guest UI in `src/components` (`0a79212`); directory, rows
  and dialogs (`5f06ba1`); profile, with the RTL profile tests migrated
  (`f6fe4d2`).

## Not verified

The final run of `check`, `test:run`, `build` and the guests E2E/CT specs with
`retries=0` never happened. The stats agent reported 1 failing Vitest test in
GuestsPage and 3 in `src/components/ReasonDialog.test.tsx` (the guests commit
`a67b36b` changed how the vant flow uses ReasonDialog, so start there).

## Remaining

1. Run the checks above and fix what fails.
2. Make sure every RTL test the agent deleted has its scenarios covered in
   Cypress (compare `git show cd90782:<old test path>` it() titles with the new
   `.cy.tsx` / `cypress/e2e/guests/` specs) and write the mapping for the
   final report.
3. `src/components/ReasonDialog.test.tsx` is still RTL: migrate it to CT once
   it passes.
