-- R03_remove_signup_trigger.sql
-- Undo step 03. Profiles already created are KEPT (they may hold data).

begin;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();
commit;
