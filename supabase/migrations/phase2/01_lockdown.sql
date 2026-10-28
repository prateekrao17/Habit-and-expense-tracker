-- 01_lockdown.sql
-- WRITE (permissions only; no data is read, changed or deleted).
-- Prerequisite: backup verified, 00 results reviewed.
-- Effect: browsers can no longer read or write any of the six tables.
-- Turns RLS ON everywhere and adds NO allow-policies (deny-all).
-- There is intentionally no rollback for this file.

begin;

alter table public.users              enable row level security;
alter table public.habits             enable row level security;
alter table public.habit_completions  enable row level security;
alter table public.expenses           enable row level security;
alter table public.notes              enable row level security;
alter table public.otp_codes          enable row level security;

-- Logged-out visitors (public key) lose every table privilege.
revoke all on public.users, public.habits, public.habit_completions,
              public.expenses, public.notes, public.otp_codes
  from anon;

-- Signed-in users get nothing until step 05 adds owner-only rules.
revoke all on public.users, public.habits, public.habit_completions,
              public.expenses, public.notes, public.otp_codes
  from authenticated;

-- Server-side admin role keeps access (needed by steps 02-05 and the login route).
grant all on public.users, public.habits, public.habit_completions,
             public.expenses, public.notes, public.otp_codes
  to service_role;

commit;

-- Expected output: "Success. No rows returned"
