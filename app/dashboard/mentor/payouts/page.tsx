import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { formatPrice } from '@/utils/stripe'
import { StripeDashboardButton } from '@/components/dashboard/stripe-dashboard-button'
import ReportIssueForm from './report-issue-form'

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
    const totalPending = pendingPayouts.reduce((sum, p) => sum + (p.amount_cents || 0), 0)

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

    const hourlyRate = mentor?.hourly_rate_cents || 2500

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-5xl font-extrabold text-accent tracking-tight">
                    Earnings & Payouts
                </h1>
                <p className="mt-4 text-gray-500 text-xl font-medium">
                    Track your sessions and view your payout history
                </p>
            </header>

            {/* Pending Payments Banner */}
            {totalPending > 0 && (
                <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[24px] text-white shadow-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium mb-1">Pending Payments</p>
                            <p className="text-4xl font-bold">
                                {formatPrice(totalPending)}
                            </p>
                            <p className="text-blue-200 text-sm mt-2">
                                {pendingPayouts.length} payment{pendingPayouts.length !== 1 ? 's' : ''} being processed
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Breakdown */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        {paidPayouts.length} completed payment{paidPayouts.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">To Be Paid</p>
                            <p className="text-2xl font-bold text-amber-600">{formatPrice(totalPending)}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500">
                        {pendingPayouts.length} pending payment{pendingPayouts.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </section>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Hourly Rate</p>
                    <p className="text-3xl font-bold text-accent">
                        {formatPrice(hourlyRate)}
                    </p>
                </div>
                <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Sessions This Month</p>
                    <p className="text-3xl font-bold text-accent">
                        {sessionsThisMonth || 0}
                    </p>
                </div>
                <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                    <p className="text-sm font-medium text-gray-500 mb-1">Payment Status</p>
                    <div className="flex items-center gap-2">
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

            {/* Stripe Dashboard Link */}
            {mentor?.payouts_enabled && (
                <div className="p-6 bg-gradient-to-r from-[#635BFF] to-[#7B73FF] rounded-[24px] text-white">
                    <div className="flex items-center justify-between">
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

            {/* Payout History */}
            <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Payout History</h2>

                {payouts && payouts.length > 0 ? (
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-lg overflow-hidden">
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
