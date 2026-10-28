# Recovery status — phase-2-auth

Nothing here has been run on the live database or deployed to production. `main` is unchanged.

## Root causes fixed in code
| Problem | Root cause | Fix |
|---|---|---|
| "Invalid or expired link" on email confirmation | The confirm page only understood `?token_hash=` links. Supabase's default `{{ .ConfirmationURL }}` template sends `?code=` (PKCE) or `#access_token=` (implicit) instead, and an email scanner opening the link first produces `#error_code=otp_expired`. A template built on `{{ .SiteURL }}` points to production, not the Preview. A redirect URL missing from Supabase's allow-list also falls back to Site URL. | `/auth/confirm` now accepts all four link formats (`lib/auth-links.ts`). It only spends a `token_hash` on a button click. Templates use `{{ .RedirectTo }}`. |
| Password reset needed the code template | Reset only worked with `{{ .Token }}`. | Added a link-based `/auth/reset` page. The code flow still works. |
| Wrong streaks and "today" around midnight | Dates came from `toISOString()` (UTC), so in India the day changed at 05:30. Streaks were incremented from cached columns and counted double ticks. | `lib/dates.ts` uses local calendar dates. `lib/streaks.ts` calculates current, longest and last streaks from real check-ins. |
| Week view ticks didn't match saved history | Completions were never loaded. The view guessed from `last_completed`. | `getHabits` loads each habit's check-ins. |
| Year-view stats were always empty | `getHabitStats` returned `null`. | Replaced with real per-habit streak and milestone cards. |
| Expense totals drifted and dates were fixed to today | Float sums. Expense date was always today. The "this month" filter used UTC. | Totals use integer paise (`lib/money.ts`, `lib/expense-summary.ts`). Expenses can have a date, be edited, and be viewed by day, month or year with a category filter. |
| `/dashboard` showed a different, broken screen | It used `habits_series` and auth IDs that don't match app records. | It now redirects to `/`, the real dashboard. |
| Stale data after sign-out | Nothing cleared the screen or listened for sign-out. | State is cleared, and the app listens for `SIGNED_OUT`. |
| Double submissions | Buttons stayed enabled during saves. | Saves now lock while in progress. Duplicate same-day check-ins are ignored. Step 07 adds a unique index. |

## Streak rule
A streak counts consecutive local calendar days that have at least one check-in. During today, the current streak stays active if the last check-in was yesterday. It becomes 0 once a full day is missed. Duplicate check-ins count once. Future dates are ignored.
Fibonacci milestones are 1, 2, 3, 5, 8, 13, 21, 34, 55, and so on. "Reached" is the highest milestone the current streak has passed. "Next" is the following one. Milestones come only from the calculated streak, so they can't be awarded twice for the same streak. After a reset, they start again from 1.

## SQL order (manual, after a confirmed backup)
00 (read-only) → STOP and review → 01 → 02 → 03 → 04 → 05 → 07a (read-only) → 07 → 06 (read-only). 08a → 08 is optional. Full table and rollback steps: `supabase/migrations/phase2/README.md`.

## Supabase settings
- Authentication → Providers → Email: enabled. Confirm email: ON.
- URL Configuration: Site URL = the production URL. Redirect URLs: `https://*-prateekrao17.vercel.app/**` (or the exact Preview URL) and `http://localhost:3000/**`.
- Email templates:
  - Confirm signup: `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`
  - Reset password: `<p>Your code: {{ .Token }}</p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>`
- Email OTP expiry: 3600 s. Use custom SMTP for anything beyond a few test emails per hour.

## Vercel (Preview scope only)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Sensitive, never `NEXT_PUBLIC_`). Then go to Deployments → the latest `phase-2-auth` deployment → Redeploy. Don't promote it.

## Tests
`npm test` runs 35 unit tests covering streaks, missed days, duplicates, month and year boundaries, Fibonacci milestones, amount validation, daily/monthly/yearly totals, no double counting, edits and deletes reflected in totals, local dates, and every email-link format.
