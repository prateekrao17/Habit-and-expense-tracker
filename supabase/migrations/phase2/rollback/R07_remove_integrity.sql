-- R07: removes the constraints added by 07. Does not touch data or RLS.
begin;
drop index if exists public.habit_completions_habit_day_key;
alter table public.expenses drop constraint if exists expenses_amount_positive;
commit;
