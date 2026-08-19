# CLAUDE.md — Access Oxbridge Portal

## 🚨 RULE 1 — NEVER MUTATE PRODUCTION DATA. NO EXCEPTIONS.

This repository is wired to a **live production Supabase project**
(`accessoxbridge-portal` / `msssqttbhlnwypnsewgl`) that holds **real student,
mentor and payment records**. `.env.local` points at production too — there is
no separate dev database. Assume every query you run hits real user data.

**Forbidden without explicit, per-instance human approval in the current
conversation:**

- `INSERT`, `UPDATE`, `DELETE`, `UPSERT`, `TRUNCATE`, `DROP`, `ALTER`
- Any Supabase `.insert()`, `.update()`, `.delete()`, `.upsert()`, `.rpc()`
  that writes
- Applying migrations (`apply_migration`, `supabase db push`, dashboard SQL)
- Creating, altering or dropping tables, columns, views, policies, roles,
  grants, buckets or triggers
- Storage writes: uploading, moving or removing objects
- Rotating or revoking keys, or changing project settings
- `git push --force`, history rewrites, or deleting branches

**Blanket approval is not a thing.** "You can write to the DB" given once does
not authorise a second write later. Ask again, every time, and state exactly
what will change and how many rows.

**Allowed freely:** `SELECT`, `count(*)`, `EXPLAIN`, reading
`information_schema` / `pg_catalog`, reading files, writing code.

### If you are unsure

Stop and ask. A blocked task is recoverable in seconds. A wrong `UPDATE` on a
production table may not be recoverable at all.

### Verifying you changed nothing

Before and after any session that touches the database, run this and confirm
the numbers are identical:

```sql
select
  (select count(*) from conversations)                  as conversations,
  (select count(*) from messages)                       as messages,
  (select count(*) from messages where is_read)         as messages_read,
  (select count(*) from profiles)                       as profiles,
  (select count(*) from sessions)                       as sessions,
  (select max(created_at) from messages)                as newest_message;
```

### Specific to the messaging feature

Reading a conversation from the CRM must **never** write `messages.is_read`.
The portal's own admin UI marks messages read; the CRM's read-only view must
not. If a student's unread badge changes because someone looked from the CRM,
that is a bug.

---

## Project shape

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase, Stripe, Zoom, Resend.
- `utils/supabase/server.ts` — RLS-respecting server client (normal path).
- `utils/supabase/admin.ts` — `createAdminClient()`, **service role, bypasses
  RLS**. Powerful. Use only in route handlers that have already authenticated
  the caller, and only for reads unless a write is explicitly approved.
- Service-to-service routes authenticate with a bearer token
  (`Authorization: Bearer ${SECRET}`), fail-closed when the secret is unset —
  see `app/api/cron/*` and `lib/service-auth.ts`.
- No test framework in this repo. Integration checks are standalone scripts.

## Conventions

- 4-space indent, no semicolons, single quotes.
- Migrations in `supabase/migrations/` are **additive only** and carry a
  rollback section at the bottom (see `20260811064603_chat_attachments.sql`).
