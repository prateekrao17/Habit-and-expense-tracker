-- R08: returns expenses.amount to double precision. Values are kept. Does not touch RLS.
begin;
alter table public.expenses alter column amount type double precision using amount::double precision;
commit;
