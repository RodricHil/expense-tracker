# Review remediation status

All six findings have code fixes. No production database migration or deployment was executed during this task.

| Finding | Resolution |
| --- | --- |
| 1. Email ownership | Google profiles must be verified. User writes and currency preferences use immutable subjects. Email collisions cannot overwrite another subject. Historical access is derived from the database record bound to that subject, never from session email. On sign-in, an already bound account's historical expense rows are migrated to its subject before the legacy marker is cleared. New accounts never receive email-based expense access. |
| 2. CSRF | Shared mutation guard verifies same-origin provenance and requires JSON content type for JSON endpoints. The bodyless category import has its own origin check. OAuth routes retain NextAuth protections. Configured managed preview origins are supported. APIs reject sessions without a stable subject. |
| 3. Categories | Shared account-independent choices and owner-scoped category mappings combine legacy and personal records for rows, counts, totals and refunds. July/October regression tests cover combined Bills matching. |
| 4. Custom dates | Pending dates are explicitly described as unapplied, Apply commits them, Cancel changes restores the applied selection, and the shared Reset button responds to date draft state. Reset uses the current 30-day range. The second date-only Reset was removed. |
| 5. Chart limits | UI, query validation and chart generation limit spans to 3,660 inclusive days. Long daily charts switch to weekly grouping with an explanatory note. Monthly/yearly buckets advance by period; point count is bounded at 732. |
| 6. Tooltip | Visibility is controlled by React state. Escape and click dismissal persist while focused or hovered; CSS no longer forces the tooltip back open. Hover, keyboard and touch use the same visibility state. |

## Operational notes

- Legacy User records with no Google subject, or a conflicting subject/email binding, require verified account recovery. They are not automatically linked by email. Their data is preserved. Existing sessions without a subject must sign in again.
- Restart the development server after these authentication/model changes. Verify sign-in with an existing bound account and custom date/apply/reset flows in the browser before deployment.
- Tests mock database boundaries; no production user records, migration counts, edge protections or browser interactions were verified.

## Validation

Full lint, TypeScript and all 247 tests passed. Production build validation is recorded in the task's final response. Regression tests cover identity collisions, legacy ownership, mutation provenance, shared category matching, range limits, and chart grouping.

---

## Original findings (before remediation)

# UI, functionality and security review

Reviewed 30 October 2026. Static review of the working tree, including recent filter/refund changes and related authentication, API validation and ownership code. No application fixes were made during this review.

Production build, full ESLint, TypeScript, all 220 tests and `git diff --check` passed. These checks do not establish that browser interactions work. No authenticated browser session, live database migration state, deployed headers, dependency advisory audit or penetration test was verified.

## High priority

### 1. Legacy email ownership can expose another identity's historical data

- **Rule:** NEXT-AUTH-001; stable identity binding.
- **Locations:** `lib/expenses.ts:57`, `lib/auth.ts:84`, `lib/auth.ts:96`.
- **Evidence:** `ownerFilter` authorizes both `session.user.id` and `session.user.email`. Google profile persistence uses `{ email }` to locate a user and overwrites `googleId` with `profile.sub`; it also records email verification without checking `profile.email_verified`.
- **Impact:** If an email address is reassigned to a different Google subject, the new identity can read/update/delete expense rows still owned by that email, and can replace the Google subject on the email-keyed user record. This is conditional on historical email-owned rows or a subject mismatch; the local code cannot establish whether affected rows currently exist.
- **Fix:** Bind users and authorization to the immutable Google subject. Reject subject mismatches and unverified profiles before persistence. Complete and verify the existing ownership migration before removing the fallback; do not remove it blindly and strand users' data. Verification of an email alone does not solve address reassignment.
- **Reference:** Google explicitly warns against using email as the unique identifier: https://developers.google.com/identity/openid-connect/openid-connect . NextAuth exposes the verification flag: https://next-auth.js.org/providers/google .

## Medium priority

### 2. Mutation routes lack an explicit CSRF boundary

- **Rule:** NEXT-CSRF-001.
- **Locations:** `app/api/expenses/route.ts:49`, `lib/validation.ts:319`, `app/api/expense-options/import/route.ts:12`.
- **Evidence:** Cookie-authenticated mutations check sessions and parse bodies, but do not validate Origin/Referer, fetch metadata or a CSRF token. `parseJsonBody` calls `req.json()` without requiring a JSON Content-Type. The import POST does not require a body. Proxy matching covers pages, not these APIs.
- **Impact:** Application-level protection relies on browser cookie defaults rather than a deliberate request-origin policy. Ordinary cross-site POSTs are generally constrained by SameSite=Lax; a malicious same-site sibling origin is an important remaining scenario because SameSite does not mean same-origin. No live exploit was demonstrated. CORS response headers are not a substitute for checking mutation origin.
- **Fix:** Add a shared trusted-origin or CSRF-token guard to mutations; reject unsupported content types on JSON endpoints. Account for the bodyless import endpoint and trusted deployment origins. Preserve OAuth callback behavior. Verify any existing edge protection before assigning exploitability.

### 3. Category choices omit historical categories outside the initial range

- **Locations:** `app/dashboard/dashboardclient.tsx:133`, `app/analytics/analytics.tsx:57`.
- **Evidence:** Both dropdowns derive legacy types from `initialData.summary.byType` / `initialSummary.byType` when available. Those values never change with the date selection. Personal options mapped to a legacy type suppress the fallback entry, even when that legacy type was absent from the initial range.
- **Reproduction:** Open on a month with no legacy Food purchases, then switch to a year containing them. The dropdown can show the custom Food option but omit Food (legacy); choosing custom Food excludes the legacy purchases. If initial loading failed, the fallback uses the filtered summary instead and can drop choices while filtering.
- **Fix:** Use a stable account-wide category catalog, independent of filtered results. Prefer one user-facing category mapping to both its personal ID and its associated legacy key. Share the option-building implementation between pages.

### 4. Custom-date draft state and Reset controls disagree

- **Locations:** `app/components/DateRangeFilter.tsx:119`, `app/components/DateRangeFilter.tsx:152`, `app/dashboard/dashboardclient.tsx:330`; same Reset condition in Analytics.
- **Evidence:** Selecting Custom immediately changes the dropdown, but does not update the applied range until Apply range is pressed. Reset filters is disabled by the parent using only applied range labels. Custom also introduces a second Reset button that resets dates only.
- **Reproduction:** From default filters, select Custom. The dropdown says Custom, cards still use Last 30 days, and Reset filters remains disabled. After editing custom inputs without applying, the UI still lacks an explicit pending-state explanation.
- **Fix:** Model draft versus applied dates explicitly, show a pending indication, and give a single shared reset visibility into draft state. Label any date-only cancellation distinctly. Compare preset/date state rather than display labels.

### 5. Large custom ranges can freeze Analytics

- **Locations:** `lib/chart-data.ts:32`, `lib/validation.ts:221`, `app/components/DateRangeFilter.tsx:154`.
- **Evidence:** Date validation checks ordering but no span limit. The spending-series builder loops over every day even for Monthly and Yearly views, then renders every resulting period.
- **Impact:** A sufficiently wide custom range can create millions of iterations and large allocations on the user's browser. This is a client responsiveness issue; cross-user denial of service was not demonstrated.
- **Fix:** Bound allowed ranges and chart point counts, choose an appropriate grouping for wide ranges, and generate monthly/yearly buckets by period instead of iterating every day.

## Low priority

### 6. Daily-average tooltip does not dismiss with Escape

- **Locations:** `app/components/DailyAverageInfo.tsx:9`, `app/globals.css:735`.
- **Evidence:** Escape sets `open=false`, but CSS still shows the tooltip whenever the wrapper has hover or focus. Clicking the icon again has the same problem while focused.
- **Impact:** Keyboard and touch dismissal disagree with `aria-expanded`; a visible tooltip can remain over nearby data.
- **Fix:** Use one visibility model with explicit dismissal state shared by hover, focus, click and Escape. Keep keyboard focus on the trigger.

## Verified positives and release notes

- Protected API handlers check sessions. Expense database queries scope ownership within the query, not after fetching.
- Category parameters are runtime validated; arbitrary MongoDB operators cannot be supplied through this field.
- Refund creation uses an atomic amount guard, and edits guard against reducing a purchase below its recorded refunds.
- Shared category/date/payment conditions now reach row queries and summary facets; the test suite asserts their alignment.
- User-facing strings are rendered through React escaping in the inspected paths. No unsafe user-content HTML sink was found there.
- The production build completed successfully. No compile-time breaking change was found.
- CSP remains intentionally report-only in `next.config.ts`; this is an existing documented hardening limitation, not evidence of an exploitable XSS issue.
- `DailyAverageInfo.tsx` is currently untracked. Include it with the release; imports in both pages depend on it. Other edits are also uncommitted.
- Follow-up validation should include component/browser tests for custom apply/reset, category availability after switching ranges, saved-card filters, tooltip dismissal and narrow mobile widths. Existing passing tests do not cover these flows.
