-- 07_integrity.sql
-- WRITE (constraints only). No rows are changed or deleted.
-- Run AFTER 05 and AFTER 07a below shows 0 duplicates.
-- Effect on the live site: none for normal use. A second identical check-in
-- for the same habit + day is rejected (the app already treats that as "done").
--
-- 07a (read-only, run first; must return 0 rows):
--   select habit_id, completion_date, count(*) from public.habit_completions
--   group by 1, 2 having count(*) > 1;
-- If it returns rows, STOP and send the count. Do not delete anything yourself.

begin;

-- One check-in per habit per calendar day.
create unique index if not exists habit_completions_habit_day_key
  on public.habit_completions (habit_id, completion_date);

-- Expenses must be positive. NOT VALID = applies to new/edited rows only,
-- existing rows are not checked or changed.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_amount_positive') then
    alter table public.expenses add constraint expenses_amount_positive check (amount > 0) not valid;
  end if;
end $$;

commit;

-- Expected output: "Success. No rows returned"
-- If it fails with "could not create unique index": duplicates exist. Nothing was applied.
