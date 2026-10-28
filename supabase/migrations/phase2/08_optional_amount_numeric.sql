-- 08_optional_amount_numeric.sql  (OPTIONAL)
-- WRITE (column type). Changes expenses.amount from floating point to
-- numeric(12,2) so the database itself stores exact rupees and paise.
-- The app already does exact paise arithmetic, so this step is not required
-- for correct totals. Run only after 06 passes and after a fresh backup.
--
-- 08a (read-only, run first). Both values must be 0:
--   select count(*) filter (where round(amount::numeric, 2) <> amount::numeric) as more_than_2_decimals,
--          count(*) filter (where abs(amount) >= 10000000000) as too_large
--   from public.expenses;
-- If either is not 0, STOP and send the numbers.
--
-- Effect: the table is briefly locked while rewritten (seconds for small tables).

begin;
alter table public.expenses alter column amount type numeric(12,2) using round(amount::numeric, 2);
commit;

-- Expected output: "Success. No rows returned"
