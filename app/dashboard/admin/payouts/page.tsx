'use client'

import { useState } from 'react'
import { formatPrice } from '@/utils/stripe'

interface MentorEarning {
    mentor_id: string
    mentor_name: string
    mentor_email: string
    stripe_account_id: string | null
    payouts_enabled: boolean
    hourly_rate_cents: number
    sessions: Array<{
        id: string
        scheduled_at: string
        duration_minutes: number
    }>
    total_minutes: number
    total_cents: number
    already_paid: boolean
}

interface PayoutCalculation {
    period_start: string
    period_end: string
    mentors: MentorEarning[]
    total_amount_cents: number
}

export default function AdminPayoutsPage() {
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [data, setData] = useState<PayoutCalculation | null>(null)
    const [selectedMentors, setSelectedMentors] = useState<Set<string>>(new Set())
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Default to current fortnight
    const today = new Date()
    const daysSinceStart = today.getDate() <= 15 ? today.getDate() - 1 : today.getDate() - 16
    const periodStart = new Date(today)
    periodStart.setDate(today.getDate() - daysSinceStart)
    periodStart.setHours(0, 0, 0, 0)

    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodStart.getDate() + 13)
    periodEnd.setHours(23, 59, 59, 999)

    const [startDate, setStartDate] = useState(periodStart.toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(periodEnd.toISOString().split('T')[0])

    const calculatePayouts = async () => {
        setLoading(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch(`/api/admin/payouts?start=${startDate}&end=${endDate}`)
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to calculate payouts')
            }
            const result = await res.json()
            setData(result)

            // Pre-select mentors who can receive payouts
            const eligible = result.mentors
                .filter((m: MentorEarning) => m.payouts_enabled && !m.already_paid)
                .map((m: MentorEarning) => m.mentor_id)
            setSelectedMentors(new Set(eligible))
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const processPayouts = async () => {
        if (selectedMentors.size === 0) {
            setError('Please select at least one mentor to process')
            return
        }

        setProcessing(true)
        setError(null)
        setSuccess(null)
        try {
            const res = await fetch('/api/admin/payouts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mentor_ids: Array.from(selectedMentors),
                    period_start: startDate,
                    period_end: endDate
                })
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to process payouts')
            }

            const result = await res.json()
            const successCount = result.results.filter((r: any) => r.success).length
            const failCount = result.results.filter((r: any) => !r.success).length

            if (successCount > 0) {
                setSuccess(`Successfully processed ${successCount} payout(s)${failCount > 0 ? `, ${failCount} failed` : ''}`)
            }
            if (failCount > 0 && successCount === 0) {
                setError('All payouts failed. Check mentor Stripe setup.')
            }

            // Refresh data
            await calculatePayouts()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setProcessing(false)
        }
    }

    const toggleMentor = (mentorId: string) => {
        const newSelected = new Set(selectedMentors)
        if (newSelected.has(mentorId)) {
            newSelected.delete(mentorId)
        } else {
            newSelected.add(mentorId)
        }
        setSelectedMentors(newSelected)
    }

    const selectableTotal = data?.mentors
        .filter(m => selectedMentors.has(m.mentor_id))
        .reduce((sum, m) => sum + m.total_cents, 0) || 0

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-extrabold text-accent tracking-tight">
                    Mentor Payouts
                </h1>
                <p className="mt-2 text-gray-500 text-lg">
                    Calculate and process fortnightly payouts for mentors
                </p>
            </header>

            {/* Date Range Selector */}
            <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Select Period</h2>
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent"
                        />
                    </div>
                    <button
                        onClick={calculatePayouts}
                        disabled={loading}
                        className="px-6 py-2.5 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Calculating...' : 'Calculate Payouts'}
                    </button>
                </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    {error}
                </div>
            )}
            {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                    {success}
                </div>
            )}

            {/* Results */}
            {data && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Mentors</p>
                            <p className="text-3xl font-bold text-accent">{data.mentors.length}</p>
                        </div>
                        <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                            <p className="text-sm font-medium text-gray-500 mb-1">Selected for Payout</p>
                            <p className="text-3xl font-bold text-accent">{selectedMentors.size}</p>
                        </div>
                        <div className="p-6 bg-white rounded-[24px] border border-gray-100 shadow-lg">
                            <p className="text-sm font-medium text-gray-500 mb-1">Total Amount</p>
                            <p className="text-3xl font-bold text-green-600">{formatPrice(selectableTotal)}</p>
                        </div>
                    </div>

                    {/* Mentor Table */}
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedMentors.size === data.mentors.filter(m => m.payouts_enabled && !m.already_paid).length}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    const eligible = data.mentors
                                                        .filter(m => m.payouts_enabled && !m.already_paid)
                                                        .map(m => m.mentor_id)
                                                    setSelectedMentors(new Set(eligible))
                                                } else {
                                                    setSelectedMentors(new Set())
                                                }
                                            }}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                    </th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Mentor</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Sessions</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Hours</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rate</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.mentors.map((mentor) => {
                                    const canPay = mentor.payouts_enabled && !mentor.already_paid
                                    return (
                                        <tr
                                            key={mentor.mentor_id}
                                            className={`
                                                transition-colors
                                                ${mentor.already_paid ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}
                                            `}
                                        >
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedMentors.has(mentor.mentor_id)}
                                                    onChange={() => toggleMentor(mentor.mentor_id)}
                                                    disabled={!canPay}
                                                    className="w-4 h-4 rounded border-gray-300 disabled:opacity-50"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{mentor.mentor_name}</p>
                                                <p className="text-sm text-gray-500">{mentor.mentor_email}</p>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{mentor.sessions.length}</td>
                                            <td className="px-6 py-4 text-gray-600">{(mentor.total_minutes / 60).toFixed(1)}</td>
                                            <td className="px-6 py-4 text-gray-600">{formatPrice(mentor.hourly_rate_cents)}/hr</td>
                                            <td className="px-6 py-4 font-semibold text-gray-900">{formatPrice(mentor.total_cents)}</td>
                                            <td className="px-6 py-4">
                                                {mentor.already_paid ? (
                                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                                                        Paid
                                                    </span>
                                                ) : mentor.payouts_enabled ? (
                                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                                                        Ready
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                                                        No Stripe
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Process Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={processPayouts}
                            disabled={processing || selectedMentors.size === 0}
                            className="px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/25"
                        >
                            {processing ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                `Process ${selectedMentors.size} Payout${selectedMentors.size !== 1 ? 's' : ''} (${formatPrice(selectableTotal)})`
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
