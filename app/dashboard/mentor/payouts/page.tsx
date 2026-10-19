import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/utils/stripe'
import { sessionAmountCents, DEFAULT_HOURLY_RATE_CENTS } from '@/utils/invoices'
import { isBillableLength, isMissingLengthColumn } from '@/utils/session-billing'
import { StripeDashboardButton } from '@/components/dashboard/stripe-dashboard-button'
import ReportIssueForm from './report-issue-form'
import InvoicingPanel from './invoicing-panel'

export default async function MentorPayoutsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return redirect('/login')

    // Verify mentor role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    // Get mentor's Stripe Connect status
    const { data: mentor } = await supabase
        .from('mentors')
        .select('stripe_account_id, payouts_enabled, hourly_rate_cents')
        .eq('id', user.id)
        .single()

    // Get payout history
    const { data: payouts } = await supabase
        .from('mentor_payouts')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false })

    // Calculate payment summaries
    const paidPayouts = payouts?.filter(p => p.status === 'paid') || []
    const pendingPayouts = payouts?.filter(p => p.status === 'pending' || p.status === 'processing') || []

    const totalPaid = paidPayouts.reduce((sum, p) => sum + (p.amount_cents || 0), 0)
    const batchedPending = pendingPayouts.reduce((sum, p) => sum + (p.amount_cents || 0), 0)

    // Real-time "to be paid": sessions that have ended/completed but are not yet included in any payout batch.
    // This makes the mentor view update immediately after Zoom webhook updates session status.
    const payoutIds = payouts?.map(p => p.id) || []
    const { data: payoutItems } = payoutIds.length > 0
        ? await supabase
            .from('mentor_payout_items')
            .select('session_id, payout_id')
            .in('payout_id', payoutIds)
        : { data: [] }

    const paidOrBatchedSessionIds = new Set(
        (payoutItems || [])
            .map((item: any) => item.session_id)
            .filter(Boolean)
    )

    const sessionColumns = 'id, duration_minutes, status, zoom_meeting_status, payout_amount_cents'
    const loadEligible = (cols: string) => supabase
        .from('sessions')
        .select(cols)
        .eq('mentor_id', user.id)
        .or('status.eq.completed,zoom_meeting_status.eq.ended')
    let { data: eligibleSessions, error: eligibleError } = await loadEligible(`${sessionColumns}, actual_minutes`)
    if (isMissingLengthColumn(eligibleError)) {
        ;({ data: eligibleSessions, error: eligibleError } = await loadEligible(sessionColumns))
    }

    const hourlyRate = mentor?.hourly_rate_cents || DEFAULT_HOURLY_RATE_CENTS
    const unbatchedPending = (eligibleSessions || [])
        .filter((s: any) => !paidOrBatchedSessionIds.has(s.id) && isBillableLength(s.actual_minutes))
        .reduce((sum: number, s: any) => {
            return sum + sessionAmountCents(
                s.duration_minutes,
                hourlyRate,
                s.payout_amount_cents
            )
        }, 0)

    const totalPending = batchedPending + unbatchedPending

    // Get completed session count this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: sessionsThisMonth } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('mentor_id', user.id)
        .or('status.eq.completed,zoom_meeting_status.eq.ended')
        .gte('scheduled_at', startOfMonth.toISOString())

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                    Earnings and payouts
                </h1>
                <p className="mt-4 text-muted-foreground text-xl font-medium">
                    Track your sessions and view your payout history
                </p>
            </header>

            {/* Earnings summary — single card: To Be Paid hero + key stats */}
            <section className="border border-transparent bg-card rounded-card shadow-border overflow-hidden">
                <div className="bg-primary p-6 text-primary-foreground">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="mb-1 text-sm font-medium text-primary-foreground/70">To be paid</p>
                            <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
                                {formatPrice(totalPending)}
                            </p>
                            <p className="mt-2 text-sm text-primary-foreground/70">
                                {pendingPayouts.length} payment{pendingPayouts.length !== 1 ? 's' : ''} being processed
                            </p>
                        </div>
                        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 sm:size-16">
                            <svg className="size-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total paid</p>
                        <p className="text-2xl font-semibold text-success">{formatPrice(totalPaid)}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {paidPayouts.length} completed payment{paidPayouts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Hourly rate</p>
                        <p className="text-2xl font-semibold text-primary">{formatPrice(hourlyRate)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Sessions this month</p>
                        <p className="text-2xl font-semibold text-primary">{sessionsThisMonth || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Payment status</p>
                        <div className="flex items-center gap-2 mt-2">
                            {mentor?.payouts_enabled ? (
                                <>
                                    <div className="size-3 bg-success rounded-full"></div>
                                    <span className="text-lg font-semibold text-success">Connected</span>
                                </>
                            ) : (
                                <>
                                    <div className="size-3 bg-warning rounded-full"></div>
                                    <span className="text-lg font-semibold text-warning">Setup required</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stripe Dashboard Link */}
            {mentor?.payouts_enabled && (
                <div className="rounded-card bg-[#635BFF] p-6 text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="mb-1 text-lg font-semibold">Stripe dashboard</h3>
                            <p className="text-white/80 text-sm">
                                View detailed transaction history, download tax documents, and manage your bank account.
                            </p>
                        </div>
                        <StripeDashboardButton />
                    </div>
                </div>
            )}

            {/* Invoicing (two-pane) */}
            <InvoicingPanel mentorName={profile?.full_name || 'Mentor'} mentorEmail={user.email || ''} />

            {/* Payout History */}
            <section>
                <h2 className="text-2xl font-semibold text-foreground mb-6">Payout history</h2>

                {payouts && payouts.length > 0 ? (
                    <>
                    {/* Phones: one card per payout. The five-column table below
                        can't be read at 375px and its wrapper clips overflow. */}
                    <div className="md:hidden space-y-3">
                        {payouts.map((payout: any) => (
                            <div
                                key={payout.id}
                                className="border border-transparent bg-card rounded-card shadow-border p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-semibold text-foreground text-sm">
                                        {new Date(payout.period_start).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short'
                                        })} - {new Date(payout.period_end).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </span>
                                    <PayoutStatusBadge status={payout.status} />
                                </div>
                                <div className="mt-3 flex items-baseline justify-between gap-3">
                                    <span className="text-2xl font-semibold text-foreground">
                                        {formatPrice(payout.amount_cents)}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                        {payout.sessions_count} session{payout.sessions_count !== 1 ? 's' : ''}
                                        {' · '}
                                        {(payout.total_minutes / 60).toFixed(1)}h
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border border-transparent hidden md:block bg-card rounded-card shadow-border overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/60 border-b border-border">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Period</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Sessions</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Hours</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {payouts.map((payout: any) => (
                                    <tr key={payout.id} className="hover:bg-muted/60 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-foreground">
                                                {new Date(payout.period_start).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short'
                                                })} - {new Date(payout.period_end).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {payout.sessions_count}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {(payout.total_minutes / 60).toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-foreground">
                                            {formatPrice(payout.amount_cents)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <PayoutStatusBadge status={payout.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    </>
                ) : (
                    <div className="p-12 bg-muted/60 rounded-card text-center">
                        <div className="size-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="size-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No payouts yet</h3>
                        <p className="text-muted-foreground">
                            Complete sessions to start earning. Payouts are processed fortnightly.
                        </p>
                    </div>
                )}
            </section>

            {/* Report Issue Section */}
            <section>
                <ReportIssueForm mentorId={user.id} />
            </section>
        </div>
    )
}

function PayoutStatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-muted text-foreground',
        processing: 'bg-tint-blue text-tint-blue-foreground',
        paid: 'bg-tint-green text-tint-green-foreground',
        failed: 'bg-tint-rose text-tint-rose-foreground'
    }

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}
