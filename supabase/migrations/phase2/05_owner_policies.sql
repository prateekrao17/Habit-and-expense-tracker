-- 05_owner_policies.sql
-- WRITE (permissions + policies). Signed-in users can reach ONLY their own rows.
-- No policy for anon anywhere. otp_codes stays deny-all (no longer used).
-- Unclaimed legacy rows stay invisible to everyone until claimed.

begin;

-- users: read own profile (no password_hash column), update a few own fields.
revoke all on public.users from authenticated;
grant select (id, email, username, created_at, last_login, mobile_no, auth_id) on public.users to authenticated;
grant update (last_login) on public.users to authenticated;

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (auth_id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (auth_id = auth.uid())
  with check (auth_id = auth.uid());

-- habits
grant select, insert, update, delete on public.habits to authenticated;
drop policy if exists habits_owner on public.habits;
create policy habits_owner on public.habits
  for all to authenticated
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- habit_completions: owner AND the habit must belong to the same owner
grant select, insert, update, delete on public.habit_completions to authenticated;
drop policy if exists completions_owner on public.habit_completions;
create policy completions_owner on public.habit_completions
  for all to authenticated
  using (user_id = public.app_user_id())
  with check (
    user_id = public.app_user_id()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = public.app_user_id())
  );

-- expenses
grant select, insert, update, delete on public.expenses to authenticated;
drop policy if exists expenses_owner on public.expenses;
create policy expenses_owner on public.expenses
  for all to authenticated
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- notes
grant select, insert, update, delete on public.notes to authenticated;
drop policy if exists notes_owner on public.notes;
create policy notes_owner on public.notes
  for all to authenticated
  using (user_id = public.app_user_id())
  with check (user_id = public.app_user_id());

-- Server-side role
grant all on public.users, public.habits, public.habit_completions,
             public.expenses, public.notes, public.otp_codes
  to service_role;

commit;

-- Expected output: "Success. No rows returned"
