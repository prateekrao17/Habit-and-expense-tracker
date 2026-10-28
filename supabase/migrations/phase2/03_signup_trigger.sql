-- 03_signup_trigger.sql
-- WRITE (function + trigger). Creates an app profile for each NEW Supabase Auth signup.
-- It NEVER links to an existing (legacy) row: if the email already exists in
-- public.users, no profile is created and the person must use the claim flow.

begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := lower(new.email);
  v_username text := lower(nullif(btrim(new.raw_user_meta_data ->> 'username'), ''));
  v_mobile   text := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'mobile', ''), '\D', '', 'g'), '');
begin
  if v_email is null then
    return new;
  end if;

  -- Existing (legacy) email: do nothing. Ownership must be proven via claim_legacy_account.
  if exists (select 1 from public.users where lower(email) = v_email) then
    return new;
  end if;

  if v_username is null
     or v_username !~ '^[a-z0-9_.]{3,30}$'
     or exists (select 1 from public.users where lower(username) = v_username) then
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 10);
  end if;

  if v_mobile is not null
     and (v_mobile !~ '^\d{10}$' or exists (select 1 from public.users where mobile_no = v_mobile)) then
    v_mobile := null;
  end if;

  insert into public.users (email, username, password_hash, auth_id, mobile_no)
  values (v_email, v_username, null, new.id, v_mobile);

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

commit;

-- Expected output: "Success. No rows returned"
