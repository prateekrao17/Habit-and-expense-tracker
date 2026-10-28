-- R02_remove_link_helpers.sql
-- Undo the reversible parts of step 02. Run only after R05 (policies use app_user_id).
-- Intentionally KEPT: users.auth_id (verified links), claim_attempts / claim_audit
-- (security history), unique indexes, mobile_no as text (reverting could lose numbers),
-- password_hash nullable (claimed accounts no longer have one).

begin;
drop function if exists public.app_user_id();
commit;
