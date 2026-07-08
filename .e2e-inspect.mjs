import { createClient } from '@supabase/supabase-js'

const RV = 'f0ffefc3-9c93-40b0-8e03-2d35c0301452'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: prof } = await db.from('profiles').select('id, full_name, email, role').eq('id', RV).single()
console.log('PROFILE:', JSON.stringify(prof))

const { data: mentor } = await db.from('mentors').select('id, stripe_account_id, payouts_enabled, hourly_rate_cents').eq('id', RV).single()
console.log('MENTOR:', JSON.stringify(mentor))

// Unbilled = finished sessions with no invoice_id.
const { data: sessions } = await db.from('sessions')
  .select('id, scheduled_at, duration_minutes, status, zoom_meeting_status, invoice_id, student_id')
  .eq('mentor_id', RV)
  .or('status.eq.completed,zoom_meeting_status.eq.ended')
  .order('scheduled_at', { ascending: true })
const unbilled = (sessions || []).filter(s => s.invoice_id == null)
console.log('UNBILLED_COUNT:', unbilled.length)
for (const s of unbilled) console.log('  UNBILLED:', s.id, s.duration_minutes + 'min', s.status, s.scheduled_at)

const { data: invoices } = await db.from('mentor_invoices')
  .select('id, invoice_number, status, total_cents, created_at')
  .eq('mentor_id', RV).order('created_at', { ascending: false })
console.log('INVOICES:')
for (const i of invoices || []) console.log('  ', i.invoice_number || '(draft)', i.status, i.total_cents, i.id)
