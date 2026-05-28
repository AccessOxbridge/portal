# Pending Tasks (Post-Migration)

## 1. Add RESEND_API_KEY to Supabase Edge Function secrets on prod

Email notifications won't send until this is done.

- Go to **Supabase Dashboard > Prod Project (msssqttbhlnwypnsewgl) > Edge Functions > send-email-notifications**
- Add secret: `RESEND_API_KEY` = (copy value from Vercel env vars)

## 2. Redeploy Edge Function with updated dashboard URL

The email template currently links to `oxbridge-portal.vercel.app` instead of `accessoxbridge.vercel.app`. The code fix is already committed but needs to be deployed to Supabase.

Requires CLI access (database password):

```bash
npx supabase link --project-ref msssqttbhlnwypnsewgl
npx supabase functions deploy send-email-notifications
```

## 3. Cleanup

- Delete `prod_migration.sql` from the project root (one-time use file, not needed anymore)
