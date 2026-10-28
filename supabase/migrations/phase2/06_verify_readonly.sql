-- 06_verify_readonly.sql
-- READ-ONLY. Run after 05 (and again after testing). Send the CSV back.
-- Totals and *_md5 values must equal the 00 results (except auth_users_total
-- and users rows added by new test signups).

select * from (
  select 1 as n, 'users_total' as check_name, count(*)::text as value from public.users
  union all select 2,  'habits_total', count(*)::text from public.habits
  union all select 3,  'habit_completions_total', count(*)::text from public.habit_completions
  union all select 4,  'expenses_total', count(*)::text from public.expenses
  union all select 5,  'notes_total', count(*)::text from public.notes
  union all select 7,  'auth_users_total', count(*)::text from auth.users
  union all select 8,  'users_linked', count(*)::text from public.users where auth_id is not null
  union all select 9,  'legacy_unclaimed', count(*)::text from public.users where auth_id is null

  union all select 40, 'users_ids_md5_legacy_only', coalesce(md5(string_agg(id::text, ',' order by id)), '-')
    from public.users where password_hash is not null or id in (select legacy_user_id from public.claim_audit)
  union all select 41, 'habits_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.habits
  union all select 42, 'completions_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.habit_completions
  union all select 43, 'expenses_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.expenses
  union all select 44, 'notes_ids_md5', coalesce(md5(string_agg(id::text || user_id::text, ',' order by id)), '-') from public.notes

  union all select 50, 'tables_with_rls_off (expect 0)', count(*)::text
    from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      and c.relname in ('users','habits','habit_completions','expenses','notes','otp_codes','claim_attempts','claim_audit')
  union all select 51, 'anon_table_privileges (expect 0)', count(*)::text
    from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and table_name in ('users','habits','habit_completions','expenses','notes','otp_codes','claim_attempts','claim_audit')
  union all select 52, 'policies_for_anon_or_public (expect 0)', count(*)::text
    from pg_policies where schemaname = 'public' and (roles @> array['anon']::name[] or roles @> array['public']::name[])
  union all select 53, 'owner_policies (expect 6)', count(*)::text
    from pg_policies where schemaname = 'public'
      and policyname in ('users_select_own','users_update_own','habits_owner','completions_owner','expenses_owner','notes_owner')
  union all select 54, 'authenticated_can_select_password_hash (expect false)',
    has_column_privilege('authenticated', 'public.users', 'password_hash', 'SELECT')::text
  union all select 55, 'anon_can_execute_claim (expect false)',
    has_function_privilege('anon', 'public.claim_legacy_account(text,text)', 'EXECUTE')::text
  union all select 56, 'authenticated_can_execute_admin_link (expect false)',
    has_function_privilege('authenticated', 'public.admin_link_account(uuid,uuid)', 'EXECUTE')::text
  union all select 57, 'signup_trigger_present (expect 1)', count(*)::text
    from pg_trigger where tgname = 'on_auth_user_created' and not tgisinternal
  union all select 58, 'claim_audit_rows', count(*)::text from public.claim_audit
  union all select 59, 'claim_failed_attempts_24h', count(*)::text
    from public.claim_attempts where not succeeded and created_at > now() - interval '24 hours'
) r
order by n;
