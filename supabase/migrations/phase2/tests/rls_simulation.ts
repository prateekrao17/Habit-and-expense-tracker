// Local simulation of steps 00-06 + rollback on an in-memory Postgres (PGlite) with mock Supabase roles.
// Run: bun add -d @electric-sql/pglite && bun supabase/migrations/phase2/tests/rls_simulation.ts
// Never touches the real database.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'fs'

const dir = new URL('../', import.meta.url).pathname
const db = new PGlite()
let pass = 0, fail = 0
function check(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, extra) }
}
const btoa_ = (s: string) => Buffer.from(s, 'latin1').toString('base64')

await db.exec(`
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to public;
grant usage on schema public to anon, authenticated, service_role;
create table public.users (id uuid primary key default gen_random_uuid(), email varchar not null, username varchar not null, password_hash varchar not null, created_at timestamp default current_timestamp, last_login timestamp, mobile_no integer);
create table public.habits (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), name varchar not null, current_streak int default 0, best_streak int default 0, last_completed date, color varchar default '#3b82f6', created_at timestamp default current_timestamp);
create table public.habit_completions (id uuid primary key default gen_random_uuid(), habit_id uuid not null references public.habits(id), user_id uuid not null references public.users(id), completion_date date not null, completed boolean default true, created_at timestamp default current_timestamp);
create table public.expenses (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), amount numeric not null, category varchar, description text, expense_date date, created_at timestamp default current_timestamp);
create table public.notes (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id), title varchar, content text, reminder_date timestamp, reminder_sent boolean default false, tags text[], pinned boolean default false, created_at timestamp default current_timestamp, updated_at timestamp default current_timestamp);
create table public.otp_codes (id uuid primary key default gen_random_uuid(), email varchar not null, otp_code varchar not null, purpose varchar default 'password_reset', expires_at timestamp not null, used boolean default false, created_at timestamp default current_timestamp);
alter table public.users enable row level security; alter table public.expenses enable row level security;
grant all on all tables in schema public to anon, authenticated, service_role;
`)
// legacy data: alice, bob
const L1 = '11111111-1111-1111-1111-111111111111', L2 = '22222222-2222-2222-2222-222222222222'
await db.query(`insert into public.users (id,email,username,password_hash) values ($1,'alice@example.com','alice',$3),($2,'bob@example.com','bob',$4)`,
  [L1, L2, btoa_('alicepw_life_tracker_secret'), btoa_('bobpw_life_tracker_secret')])
await db.exec(`
insert into public.habits (id,user_id,name) values ('aaaaaaaa-0000-0000-0000-000000000001','${L1}','A habit'),('bbbbbbbb-0000-0000-0000-000000000001','${L2}','B habit');
insert into public.habit_completions (habit_id,user_id,completion_date) values ('aaaaaaaa-0000-0000-0000-000000000001','${L1}','2026-01-01');
insert into public.expenses (user_id,amount) values ('${L1}',10),('${L2}',20);
insert into public.notes (user_id,title) values ('${L1}','A note'),('${L2}','B note');
`)

const pre = await db.query(readFileSync(dir + '00_preflight_readonly.sql', 'utf8'))
const preMap: Record<string, string> = {}
for (const r of pre.rows as any[]) preMap[r.check_name] = r.value
console.log('00 output:', JSON.stringify(preMap))

for (const f of ['01_lockdown.sql', '02_auth_link_schema.sql', '03_signup_trigger.sql', '04_claim_functions.sql', '05_owner_policies.sql']) {
  await db.exec(readFileSync(dir + f, 'utf8')); console.log('applied', f)
}

async function as(role: string, sub: string | null, sql: string, params: any[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ''}', false);`)
  await db.exec(`set role ${role}`)
  try { return { rows: (await db.query(sql, params)).rows as any[], error: null as any } }
  catch (e: any) { return { rows: [] as any[], error: e.message } }
  finally { await db.exec('reset role') }
}

// Auth accounts
const ins = async (email: string, confirmed: boolean, meta = {}) =>
  ((await db.query(`insert into auth.users (email,email_confirmed_at,raw_user_meta_data) values ($1,$2,$3) returning id`,
    [email, confirmed ? new Date().toISOString() : null, JSON.stringify(meta)])).rows[0] as any).id as string

// anon
for (const t of ['users', 'habits', 'habit_completions', 'expenses', 'notes', 'otp_codes']) {
  const r = await as('anon', null, `select * from public.${t}`)
  check(`anon cannot read ${t}`, !!r.error || r.rows.length === 0, r.error ?? '')
}
check('anon cannot insert habit', !!(await as('anon', null, `insert into public.habits (user_id,name) values ('${L1}','x')`)).error)
check('anon cannot call claim', !!(await as('anon', null, `select public.claim_legacy_account('alice','alicepw')`)).error)

// New signup A, B (fresh emails) -> profiles created
const A = await ins('testa@example.com', true, { username: 'testa', mobile: '9876543210' })
const B = await ins('testb@example.com', true, { username: 'testb' })
const prof = await db.query(`select username, mobile_no, auth_id from public.users where auth_id in ($1,$2) order by username`, [A, B])
check('signup trigger creates profiles for A and B', prof.rows.length === 2)
check('10-digit mobile stored', (prof.rows[0] as any).mobile_no === '9876543210')

const Aid = ((await as('authenticated', A, `select id from public.users`)).rows[0] || {}).id
check('A sees only own profile', (await as('authenticated', A, `select id from public.users`)).rows.length === 1)
check('A cannot read password_hash', !!(await as('authenticated', A, `select password_hash from public.users`)).error)
const ah = await as('authenticated', A, `insert into public.habits (user_id,name) values ($1,'A test habit') returning id`, [Aid])
check('A can create own habit', !ah.error, ah.error)
check('B cannot see A habit', (await as('authenticated', B, `select * from public.habits`)).rows.length === 0)
const bupd = await as('authenticated', B, `update public.habits set name='hacked' returning id`)
check('B cannot update A habit', bupd.rows.length === 0)
const bdel = await as('authenticated', B, `delete from public.habits returning id`)
check('B cannot delete A habit', bdel.rows.length === 0)
check('B cannot insert with A user_id', !!(await as('authenticated', B, `insert into public.habits (user_id,name) values ($1,'x')`, [Aid])).error)
check('B cannot insert expense as legacy alice', !!(await as('authenticated', B, `insert into public.expenses (user_id,amount) values ($1,1)`, [L1])).error)
const Bid = ((await as('authenticated', B, `select id from public.users`)).rows[0] || {}).id
check('B cannot add completion to A habit', !!(await as('authenticated', B,
  `insert into public.habit_completions (habit_id,user_id,completion_date) values ($1,$2,'2026-01-02')`, [ah.rows[0]?.id, Bid])).error)
check('B cannot change own auth_id', !!(await as('authenticated', B, `update public.users set auth_id=$1`, [A])).error)
check('A cannot call admin_link', !!(await as('authenticated', A, `select public.admin_link_account($1,$2)`, [L1, A])).error)

// Legacy email signups: no automatic link
const Cun = await ins('alice@example.com', false)
check('signup with legacy email creates no profile, no link',
  ((await db.query(`select count(*)::int c from public.users where auth_id=$1 or (id=$2 and auth_id is not null)`, [Cun, L1])).rows[0] as any).c === 0)
check('unconfirmed email cannot claim', (await as('authenticated', Cun, `select public.claim_legacy_account('alice','alicepw') ok`)).rows[0]?.ok === false)
check('unconfirmed sees no legacy data', (await as('authenticated', Cun, `select * from public.habits`)).rows.length === 0)
await db.query(`update auth.users set email_confirmed_at=now() where id=$1`, [Cun])
check('wrong old password fails', (await as('authenticated', Cun, `select public.claim_legacy_account('alice','nope') ok`)).rows[0]?.ok === false)
check('B (different email) cannot claim alice even with right password', (await as('authenticated', B, `select public.claim_legacy_account('alice','alicepw') ok`)).rows[0]?.ok === false)
check('correct claim succeeds', (await as('authenticated', Cun, `select public.claim_legacy_account('alice','alicepw') ok`)).rows[0]?.ok === true)
const after = await as('authenticated', Cun, `select h.name from public.habits h`)
check('claimed user sees original habit', after.rows.length === 1 && after.rows[0].name === 'A habit')
check('claimed user sees original note + expense + completion',
  (await as('authenticated', Cun, `select * from public.notes`)).rows.length === 1 &&
  (await as('authenticated', Cun, `select * from public.expenses`)).rows.length === 1 &&
  (await as('authenticated', Cun, `select * from public.habit_completions`)).rows.length === 1)
check('password_hash nulled after claim', ((await db.query(`select password_hash from public.users where id=$1`, [L1])).rows[0] as any).password_hash === null)
check('claim replay fails', (await as('authenticated', Cun, `select public.claim_legacy_account('alice','alicepw') ok`)).rows[0]?.ok === false)

// Rate limit on bob row
const Bob = await ins('bob@example.com', true)
for (let i = 0; i < 5; i++) await as('authenticated', Bob, `select public.claim_legacy_account('bob','wrong${i}')`)
check('6th attempt blocked even with correct password', (await as('authenticated', Bob, `select public.claim_legacy_account('bob','bobpw') ok`)).rows[0]?.ok === false)
check('bob row still unclaimed', ((await db.query(`select auth_id from public.users where id=$1`, [L2])).rows[0] as any).auth_id === null)
// admin link path
const r = await db.query(`select public.admin_link_account($1,$2) r`, [L2, Bob])
check('admin link works for verified case', (r.rows[0] as any).r === 'OK: linked', (r.rows[0] as any).r)
check('admin link refuses relink', ((await db.query(`select public.admin_link_account($1,$2) r`, [L2, A])).rows[0] as any).r.startsWith('ERROR'))

const post = await db.query(readFileSync(dir + '06_verify_readonly.sql', 'utf8'))
const pm: Record<string, string> = {}
for (const x of post.rows as any[]) pm[x.check_name] = x.value
console.log('06 output:', JSON.stringify(pm))
check('06 rls off = 0', pm['tables_with_rls_off (expect 0)'] === '0')
check('06 anon privileges = 0', pm['anon_table_privileges (expect 0)'] === '0')
check('06 owner policies = 6', pm['owner_policies (expect 6)'] === '6')
check('06 legacy user ids unchanged', pm['users_ids_md5_legacy_only'] === preMap['users_ids_md5'])

// rollback keeps deny-all
for (const f of ['R05_remove_owner_policies.sql', 'R04_remove_claim_functions.sql', 'R03_remove_signup_trigger.sql', 'R02_remove_link_helpers.sql'])
  await db.exec(readFileSync(dir + 'rollback/' + f, 'utf8'))
const rl = await db.query(`select count(*)::int c from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity`)
check('after full rollback: RLS still on everywhere', (rl.rows[0] as any).c === 0)
check('after full rollback: A sees nothing', (await as('authenticated', A, `select * from public.habits`)).rows.length === 0)
check('after full rollback: anon sees nothing', (await as('anon', null, `select * from public.notes`)).rows.length === 0)
check('after full rollback: data intact', ((await db.query(`select count(*)::int c from public.habits`)).rows[0] as any).c === 3)

console.log(`\n${pass} passed, ${fail} failed`)
