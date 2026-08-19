import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/utils/stripe'
import { sessionAmountCents, DEFAULT_HOURLY_RATE_CENTS } from '@/utils/invoices'
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

    const { data: eligibleSessions } = await supabase
        .from('sessions')
        .select('id, duration_minutes, status, zoom_meeting_status, payout_amount_cents')
        .eq('mentor_id', user.id)
        .or('status.eq.completed,zoom_meeting_status.eq.ended')

    const hourlyRate = mentor?.hourly_rate_cents || DEFAULT_HOURLY_RATE_CENTS
    const unbatchedPending = (eligibleSessions || [])
        .filter((s: any) => !paidOrBatchedSessionIds.has(s.id))
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
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-accent tracking-tight">
                    Earnings & Payouts
                </h1>
                <p className="mt-4 text-gray-500 text-xl font-medium">
                    Track your sessions and view your payout history
                </p>
            </header>

            {/* Earnings summary — single card: To Be Paid hero + key stats */}
            <section className="bg-white rounded-[24px] border border-gray-100 shadow-lg overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-blue-100 text-sm font-medium mb-1">To Be Paid</p>
                            <p className="text-3xl sm:text-4xl font-bold">
                                {formatPrice(totalPending)}
                            </p>
                            <p className="text-blue-200 text-sm mt-2">
                                {pendingPayouts.length} payment{pendingPayouts.length !== 1 ? 's' : ''} being processed
                            </p>
                        </div>
                        <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-white/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Total Paid</p>
                        <p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p>
                        <p className="text-sm text-gray-500 mt-1">
                            {paidPayouts.length} completed payment{paidPayouts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Hourly Rate</p>
                        <p className="text-2xl font-bold text-accent">{formatPrice(hourlyRate)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Sessions This Month</p>
                        <p className="text-2xl font-bold text-accent">{sessionsThisMonth || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Payment Status</p>
                        <div className="flex items-center gap-2 mt-2">
                            {mentor?.payouts_enabled ? (
                                <>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-lg font-semibold text-green-600">Connected</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                    <span className="text-lg font-semibold text-amber-600">Setup Required</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Stripe Dashboard Link */}
            {mentor?.payouts_enabled && (
                <div className="p-6 bg-gradient-to-r from-[#635BFF] to-[#7B73FF] rounded-[24px] text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="text-xl font-bold mb-1">Stripe Dashboard</h3>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payout History</h2>

                {payouts && payouts.length > 0 ? (
                    <>
                    {/* Phones: one card per payout. The five-column table below
                        can't be read at 375px and its wrapper clips overflow. */}
                    <div className="md:hidden space-y-3">
                        {payouts.map((payout: any) => (
                            <div
                                key={payout.id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span className="font-semibold text-gray-900 text-sm">
                                        {new Date(payout.period_start).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short'
                                        })} - {new Date(payout.period_end).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </span>
                                    <PayoutStatusBadge status={payout.status} />
                                </div>
                                <div className="mt-3 flex items-baseline justify-between gap-3">
                                    <span className="text-2xl font-bold text-gray-900">
                                        {formatPrice(payout.amount_cents)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {payout.sessions_count} session{payout.sessions_count !== 1 ? 's' : ''}
                                        {' · '}
                                        {(payout.total_minutes / 60).toFixed(1)}h
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block bg-white rounded-[24px] border border-gray-100 shadow-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Period</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Sessions</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hours</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {payouts.map((payout: any) => (
                                    <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">
                                                {new Date(payout.period_start).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short'
                                                })} - {new Date(payout.period_end).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {payout.sessions_count}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {(payout.total_minutes / 60).toFixed(1)}
                                        </td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">
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
                    <div className="p-12 bg-gray-50 rounded-[24px] text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No payouts yet</h3>
                        <p className="text-gray-500">
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
        pending: 'bg-gray-100 text-gray-700',
        processing: 'bg-blue-100 text-blue-700',
        paid: 'bg-green-100 text-green-700',
        failed: 'bg-red-100 text-red-700'
    }

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status] || styles.pending}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    )
}
