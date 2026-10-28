-- R05_remove_owner_policies.sql
-- Undo step 05. Result: deny-all (same as after step 01). RLS stays ON.
-- Use if the new app misbehaves: nobody can read data until fixed. Nothing becomes public.

begin;

drop policy if exists users_select_own   on public.users;
drop policy if exists users_update_own   on public.users;
drop policy if exists habits_owner       on public.habits;
drop policy if exists completions_owner  on public.habit_completions;
drop policy if exists expenses_owner     on public.expenses;
drop policy if exists notes_owner        on public.notes;

revoke all on public.users, public.habits, public.habit_completions,
              public.expenses, public.notes, public.otp_codes
  from authenticated, anon;

commit;
