# Phase 2 rollback

Run in reverse: R05 -> R04 -> R03 -> R02. Stop at the first file that gets you back to a working state.

Guarantees:
- No file disables RLS or grants anything to `anon`.
- The fallback state is always deny-all (nobody can read), never public.
- Step 01 (lockdown) has no rollback by design.
- No file deletes users, habits, completions, expenses or notes.

The app code rollback is separate: point Vercel Preview back to `phase-1-cleanup` (production is never changed in this phase).
