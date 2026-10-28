-- 00_preflight_readonly.sql
-- READ-ONLY. Changes nothing. Safe to run any time.
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Export the result (Download CSV) and send it back before any other step.
-- Shows counts only: no emails, usernames, passwords or record contents.

select * from (
  select 1 as n, 'users_total' as check_name, count(*)::text as value from public.users
  union all select 2,  'habits_total', count(*)::text from public.habits
  union all select 3,  'habit_completions_total', count(*)::text from public.habit_completions
  union all select 4,  'expenses_total', count(*)::text from public.expenses
  union all select 5,  'notes_total', count(*)::text from public.notes
  union all select 6,  'otp_codes_total', count(*)::text from public.otp_codes
  union all select 7,  'auth_users_total', count(*)::text from auth.users

  -- Duplicates that would block unique indexes (must all be 0)
  union all select 10, 'dup_emails_case_insensitive', count(*)::text
    from (select lower(email) from public.users group by 1 having count(*) > 1) d
  union all select 11, 'dup_usernames_case_insensitive', count(*)::text
    from (select lower(username) from public.users group by 1 having count(*) > 1) d
  union all select 12, 'dup_mobile_no', count(*)::text
    from (select mobile_no from public.users where mobile_no is not null group by 1 having count(*) > 1) d

  union all select 13, 'dup_completions_same_habit_day', count(*)::text
    from (select habit_id, completion_date from public.habit_completions group by 1, 2 having count(*) > 1) d
  union all select 14, 'expenses_amount_not_positive', count(*)::text
    from public.expenses where amount is null or amount <= 0

  -- Accounts whose stored email is a placeholder (cannot receive mail -> owner-assisted claim)
  union all select 20, 'placeholder_emails_local_app', count(*)::text
    from public.users where email ilike '%@local.app'
  union all select 21, 'placeholder_emails_mobile_local', count(*)::text
    from public.users where email ilike '%@mobile.local'
  union all select 22, 'real_looking_emails', count(*)::text
    from public.users where email not ilike '%@local.app' and email not ilike '%@mobile.local'
  union all select 23, 'mobile_no_filled', count(*)::text
    from public.users where mobile_no is not null
  union all select 24, 'password_hash_empty', count(*)::text
    from public.users where coalesce(password_hash, '') = ''

  -- Orphans (must all be 0)
  union all select 30, 'orphan_habits', count(*)::text
    from public.habits h where not exists (select 1 from public.users u where u.id = h.user_id)
  union all select 31, 'orphan_completions_user', count(*)::text
    from public.habit_completions c where not exists (select 1 from public.users u where u.id = c.user_id)
  union all select 32, 'orphan_completions_habit', count(*)::text
    from public.habit_completions c where not exists (select 1 from public.habits h where h.id = c.habit_id)
  union all select 33, 'completion_owner_mismatch', count(*)::text
    from public.habit_completions c join public.habits h on h.id = c.habit_id where h.user_id <> c.user_id
  union all select 34, 'orphan_expenses', count(*)::text
    from public.expenses e where not exists (select 1 from public.users u where u.id = e.user_id)
  union all select 35, 'orphan_notes', count(*)::text
    from public.notes x where not exists (select 1 from public.users u where u.id = x.user_id)

  -- Fingerprints of ID sets (compared again in step 06; must not change)
  union all select 40, 'users_ids_md5', coalesce(md5(string_agg(id::text, ',' order by id)), '-') from public.users
  union all select 41, 'habits_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.habits
  union all select 42, 'completions_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.habit_completions
  union all select 43, 'expenses_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.expenses
  union all select 44, 'notes_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.notes

  -- Current state of things later steps will create (expected: false / 0)
  union all select 50, 'users_auth_id_column_exists', (exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'auth_id'))::text
  union all select 51, 'phase2_functions_present', count(*)::text
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
    where s.nspname = 'public' and p.proname in ('app_user_id','handle_new_auth_user','claim_legacy_account','admin_link_account')
  union all select 52, 'public_policies_total', count(*)::text from pg_policies where schemaname = 'public'
  union all select 53, 'tables_with_rls_off', count(*)::text
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      and c.relname in ('users','habits','habit_completions','expenses','notes','otp_codes')
  union all select 54, 'anon_table_privileges', count(*)::text
    from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and table_name in ('users','habits','habit_completions','expenses','notes','otp_codes')
) r
order by n;
