-- 02_auth_link_schema.sql
-- WRITE (additive schema only). No existing rows are changed except the
-- lossless type change of users.mobile_no (integer -> text).
-- Still deny-all for browsers after this step.

begin;

-- 1. Link column between an app user and a Supabase Auth account.
alter table public.users add column if not exists auth_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_auth_id_key') then
    alter table public.users add constraint users_auth_id_key unique (auth_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_auth_id_fkey') then
    alter table public.users
      add constraint users_auth_id_fkey foreign key (auth_id)
      references auth.users(id) on delete set null;
  end if;
end $$;

-- 2. New accounts have no legacy password.
alter table public.users alter column password_hash drop not null;

-- 3. 10-digit mobile numbers do not fit in integer.
alter table public.users alter column mobile_no type text using mobile_no::text;

-- 4. Uniqueness (00 must have reported 0 duplicates, otherwise this fails and rolls back).
create unique index if not exists users_email_lower_key    on public.users (lower(email));
create unique index if not exists users_username_lower_key on public.users (lower(username));
create unique index if not exists users_mobile_no_key      on public.users (mobile_no) where mobile_no is not null;

-- 5. Claim bookkeeping. RLS on, no policies: browsers can never see these.
create table if not exists public.claim_attempts (
  id             bigserial primary key,
  auth_user_id   uuid not null,
  legacy_user_id uuid,
  succeeded      boolean not null,
  created_at     timestamptz not null default now()
);
create index if not exists claim_attempts_auth_idx   on public.claim_attempts (auth_user_id, created_at);
create index if not exists claim_attempts_legacy_idx on public.claim_attempts (legacy_user_id, created_at);

create table if not exists public.claim_audit (
  id             bigserial primary key,
  legacy_user_id uuid not null,
  auth_user_id   uuid not null,
  method         text not null check (method in ('self', 'admin')),
  created_at     timestamptz not null default now()
);

alter table public.claim_attempts enable row level security;
alter table public.claim_audit    enable row level security;
revoke all on public.claim_attempts, public.claim_audit from anon, authenticated;
grant  all on public.claim_attempts, public.claim_audit to service_role;
grant  usage, select on sequence public.claim_attempts_id_seq, public.claim_audit_id_seq to service_role;

-- 6. "Which app user am I?" used by every policy in step 05.
create or replace function public.app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid()
$$;

revoke all on function public.app_user_id() from public, anon;
grant execute on function public.app_user_id() to authenticated, service_role;

commit;

-- Expected output: "Success. No rows returned"
-- If it fails with "could not create unique index": a duplicate exists. Nothing was applied. Stop and report.
