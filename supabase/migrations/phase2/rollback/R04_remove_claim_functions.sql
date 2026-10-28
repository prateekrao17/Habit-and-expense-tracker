-- R04_remove_claim_functions.sql
-- Undo step 04. Links already made (auth_id) and the audit trail are KEPT.

begin;
drop function if exists public.claim_legacy_account(text, text);
drop function if exists public.admin_link_account(uuid, uuid);
commit;
