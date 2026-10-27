// Regression test in isolated Docker only; every SQL change is rolled back.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const migration = readFileSync(new URL('../supabase/migrations/20261027083312_account_access_controls.sql', import.meta.url), 'utf8')
const guard = migration.match(/DO \$guard\$[\s\S]*?END \$guard\$;/)?.[0]
assert.ok(guard, 'The migration contains its view guard')
const sql = `
BEGIN;
SET LOCAL statement_timeout = '5s';
CREATE VIEW public.account_view_barrier_probe WITH (security_barrier=true) AS SELECT 1 AS id;
CREATE VIEW public.account_view_invoker_probe WITH (security_invoker=true, security_barrier=true) AS SELECT 2 AS id;
CREATE VIEW public.account_view_plain_probe AS SELECT 3 AS id;
REVOKE ALL ON public.account_view_barrier_probe FROM anon;
GRANT SELECT ON public.account_view_barrier_probe TO authenticated;
CREATE TEMP TABLE view_metadata_before AS
SELECT c.oid, c.reloptions, c.relacl, c.relowner FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'v';
${guard}
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM view_metadata_before b JOIN pg_class c ON c.oid = b.oid
        WHERE c.reloptions IS DISTINCT FROM b.reloptions
        OR c.relacl IS DISTINCT FROM b.relacl
        OR c.relowner IS DISTINCT FROM b.relowner
    ) THEN RAISE EXCEPTION 'View options, grants or owners changed'; END IF;
    IF (SELECT id FROM public.account_view_barrier_probe) <> 1
        OR (SELECT id FROM public.account_view_invoker_probe) <> 2
        OR (SELECT id FROM public.account_view_plain_probe) <> 3
    THEN RAISE EXCEPTION 'Enabled view results changed'; END IF;
END $$;
ROLLBACK;
`
const result = spawnSync('docker', ['exec', '-i', 'supabase_db_ao-portal-localtest', 'psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' })
assert.equal(result.status, 0, result.stderr || result.error?.message)
console.log('PASS migration preserves view security options, grants, owners and enabled results (local transaction rolled back)')
