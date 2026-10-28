-- 04_claim_functions.sql
-- WRITE (functions only). The legacy password is compared ONLY here, inside the
-- database. Stored hashes are never returned to any caller.
--
-- claim_legacy_account: called by a signed-in user (authenticated role).
--   Requires ALL of:
--     a) signed in to Supabase Auth with a CONFIRMED email,
--     b) that email equals the legacy row's email,
--     c) the legacy username / email / mobile supplied matches that same row,
--     d) the old password matches the stored legacy hash,
--     e) the row is not already claimed and the caller is not already linked,
--     f) fewer than 5 failed attempts in 24h for the caller AND for the row.
--   On success (one transaction): links auth_id, nulls password_hash (no replay),
--   writes an audit row. Returns only true / false; never says why.
--
-- admin_link_account: owner-assisted link for people who forgot the old
--   password or whose legacy email is a placeholder. service_role / SQL editor only.

begin;

create or replace function public.claim_legacy_account(p_identifier text, p_old_password text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_email      text;
  v_confirmed  timestamptz;
  v_ident      text := lower(btrim(coalesce(p_identifier, '')));
  v_row        public.users%rowtype;
  v_fail_user  int;
  v_fail_row   int;
  v_expected   text;
begin
  if v_uid is null or v_ident = '' or coalesce(p_old_password, '') = '' then
    return false;
  end if;

  select lower(email), email_confirmed_at into v_email, v_confirmed
  from auth.users where id = v_uid;

  if v_email is null or v_confirmed is null then
    return false;
  end if;

  -- Caller already owns an app profile -> cannot claim a second one.
  if exists (select 1 from public.users where auth_id = v_uid) then
    return false;
  end if;

  select count(*) into v_fail_user
  from public.claim_attempts
  where auth_user_id = v_uid and not succeeded and created_at > now() - interval '24 hours';
  if v_fail_user >= 5 then
    return false;
  end if;

  select * into v_row
  from public.users
  where lower(email) = v_email
    and (lower(email) = v_ident or lower(username) = v_ident or mobile_no = v_ident)
  for update;

  if not found then
    insert into public.claim_attempts (auth_user_id, legacy_user_id, succeeded) values (v_uid, null, false);
    return false;
  end if;

  select count(*) into v_fail_row
  from public.claim_attempts
  where legacy_user_id = v_row.id and not succeeded and created_at > now() - interval '24 hours';

  -- Legacy format (old lib/auth.ts): btoa(password.trim() + '_life_tracker_secret')
  v_expected := replace(replace(
                  encode(convert_to(btrim(p_old_password, E' \t\r\n') || '_life_tracker_secret', 'UTF8'), 'base64'),
                E'\n', ''), E'\r', '');

  if v_fail_row >= 5
     or v_row.auth_id is not null
     or v_row.password_hash is null
     or v_row.password_hash <> v_expected then
    insert into public.claim_attempts (auth_user_id, legacy_user_id, succeeded) values (v_uid, v_row.id, false);
    return false;
  end if;

  update public.users
     set auth_id = v_uid, password_hash = null
   where id = v_row.id and auth_id is null;

  insert into public.claim_attempts (auth_user_id, legacy_user_id, succeeded) values (v_uid, v_row.id, true);
  insert into public.claim_audit (legacy_user_id, auth_user_id, method) values (v_row.id, v_uid, 'self');
  return true;
end;
$$;

revoke all on function public.claim_legacy_account(text, text) from public, anon;
grant execute on function public.claim_legacy_account(text, text) to authenticated;

create or replace function public.admin_link_account(p_legacy_user_id uuid, p_auth_user_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_row       public.users%rowtype;
  v_confirmed timestamptz;
begin
  select * into v_row from public.users where id = p_legacy_user_id for update;
  if not found then return 'ERROR: legacy user not found'; end if;
  if v_row.auth_id is not null then return 'ERROR: legacy user already linked'; end if;

  select email_confirmed_at into v_confirmed from auth.users where id = p_auth_user_id;
  if not found then return 'ERROR: auth user not found'; end if;
  if v_confirmed is null then return 'ERROR: auth user email not confirmed'; end if;
  if exists (select 1 from public.users where auth_id = p_auth_user_id) then
    return 'ERROR: auth user already has an app profile (remove the empty new profile first, after checking it has no data)';
  end if;

  update public.users set auth_id = p_auth_user_id, password_hash = null where id = p_legacy_user_id;
  insert into public.claim_audit (legacy_user_id, auth_user_id, method) values (p_legacy_user_id, p_auth_user_id, 'admin');
  return 'OK: linked';
end;
$$;

revoke all on function public.admin_link_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_link_account(uuid, uuid) to service_role;

commit;

-- Expected output: "Success. No rows returned"
