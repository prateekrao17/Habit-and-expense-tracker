# Phase 2: Supabase Auth migration runbook

Branch: `phase-2-auth` (built on `phase-1-cleanup`). Nothing here has been run on the real database.
Run every file yourself in Supabase → SQL Editor → New query → paste → Run. Do one file at a time and stop at the first error.

## Before any write step
Confirm a fresh backup taken today (Supabase → Database → Backups, or a `pg_dump`). Write steps 01–05 must not be run without it.

## Order, expected output, impact on the live site

| Step | File | Type | Expected output | Live site impact |
|---|---|---|---|---|
| 00 | 00_preflight_readonly.sql | read-only | One table of `check_name / value` rows. Download as CSV and send it. Must show 0 for every `dup_*` and `orphan_*` row. | None |
| — | **Stop.** Review 00 results and confirm the backup. | | | |
| 01 | 01_lockdown.sql | write (permissions) | `Success. No rows returned` | Habits, notes and completions stop being publicly readable or writable. Login, signup and expenses were already blocked, so nothing that currently works for real users breaks further. |
| 02 | 02_auth_link_schema.sql | write (additive) | `Success. No rows returned` | None (still locked) |
| 03 | 03_signup_trigger.sql | write | `Success. No rows returned` | None |
| 04 | 04_claim_functions.sql | write | `Success. No rows returned` | None |
| 05 | 05_owner_policies.sql | write | `Success. No rows returned` | Old production code still can't log in (it uses the removed custom login). Only the Preview build works. |
| 06 | 06_verify_readonly.sql | read-only | The rows marked `expect` must match. `users_ids_md5_legacy_only` must equal 00's `users_ids_md5`, and the habits, completions, expenses and notes md5 values must equal 00 until test data is added. Send the CSV. | None |

Each write file is one transaction: if it errors, nothing from that file is applied, and the database stays in the previous row's state. Always at least deny-all.

If step 02 fails with "could not create unique index", a duplicate exists. Nothing was changed. Send me the error.

## Rollback (never opens data)
Use `rollback/` files in reverse order: R05 → R04 → R03 → R02. The fallback state is deny-all.
- No rollback file disables RLS or grants anything to `anon`.
- Step 01 has no rollback by design.
- Rollback never deletes users, habits, completions, expenses or notes.
- Verified links (`auth_id`) and the claim audit trail are kept.

## Security confirmations
- The legacy password is compared only inside the `claim_legacy_account` database function (SECURITY DEFINER). The browser sends the typed old password once over HTTPS. Stored hashes are never selectable by `authenticated` (column grant excludes `password_hash`) or `anon`.
- Claim rate limit: 5 failed attempts per 24 h per signed-in account AND per legacy account, stored in `claim_attempts` (no browser access). A success nulls the legacy hash, so it can't be replayed.
- Claim requires a confirmed email that equals the legacy email, plus the old identifier, plus the old password. The function returns true/false only.
- `SUPABASE_SERVICE_ROLE_KEY` is read only in `lib/supabase-admin.ts` (`import 'server-only'`), used only by `app/api/login` and `app/api/signup`. It is never logged or returned. A build scan of `.next/static` found no trace of it.
- `/api/login` gives the same message for an unknown account and a wrong password. Unknown identifiers still perform one real sign-in attempt, to keep timing similar. Signup says "username / mobile not available" for taken handles; this can't be avoided.

## Manual settings (you)
Supabase → Authentication:
1. Sign In / Providers → Email: enabled. **Confirm email: ON.**
2. URL Configuration: Site URL = your production URL. Redirect URLs: add your Vercel preview pattern, e.g. `https://*-prateekrao17.vercel.app/**`, and `http://localhost:3000/**`.
3. Emails → **Reset Password** template: include `{{ .Token }}` (the 6-digit code the app's reset screen asks for), e.g. `Your reset code is {{ .Token }}`.
4. Email OTP expiration: 3600 seconds.
5. Recommended: custom SMTP (the built-in sender allows only a few emails per hour).

Vercel → Project → Settings → Environment Variables, **Preview scope only**:
- `NEXT_PUBLIC_SUPABASE_URL` = `https://llfqsfxbuvwbqwqioyoo.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = existing anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase → Settings → API → service_role (mark it Sensitive; never prefix it with NEXT_PUBLIC_)

Then redeploy the `phase-2-auth` preview (Deployments → the branch's deployment → Redeploy). Production is untouched: do not promote.

Note: the database is shared, so after step 01 the security changes apply to everyone. The new code only runs on Preview.

## Preview test checklist (accounts A and B with real inboxes you control, plus one real legacy account)
- [ ] A: sign up → "check your email" → logging in before confirming is refused → click the link → login works (email, username, mobile).
- [ ] Failed confirmation: open a tampered or old link → error, no session.
- [ ] Duplicate email: sign up again with A's email → same "check your email" message, no second account.
- [ ] Unknown username vs wrong password → identical message.
- [ ] Logout → back to the login screen. Opening `/` redirects to `/auth`.
- [ ] A adds a habit, completion, expense and note. B logs in and sees none of them.
- [ ] Unauthorized API: with B's token (browser devtools), try `GET /rest/v1/habits?user_id=eq.<A id>` → `[]`. With only the anon key → 401/`[]` on every table.
- [ ] Forgot password → email code → new password works, the old one fails. A reused or expired (>1 h) code → "Invalid or expired code".
- [ ] Legacy claim: sign up with an old account's email → confirm → log in → redirected to "Link Your Existing Account" → old username + old password → original data appears.
- [ ] Claim replay: log out, sign in as another confirmed account, repeat the same claim → fails.
- [ ] Wrong old password 5× → 6th attempt fails even with the right password (24 h lock).
- [ ] Run 06 again and send the result.

## Owner-assisted link (forgotten old password / placeholder email)
After verifying the person outside the app, find the two IDs (do not share them publicly) and run:
`select public.admin_link_account('<legacy users.id>', '<auth.users.id>');` → should return `OK: linked`.
If it says the auth user already has a profile, that profile was auto-created at signup. Check it has no data before removing it; ask me first.
