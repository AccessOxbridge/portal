'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatPrice } from '@/utils/stripe'

interface Purchase {
    id: string
    user_id: string
    credits_purchased: number
    amount_paid_cents: number
    currency: string
    status: string
    completed_at: string | null
    stripe_session_id: string | null
    profiles: { full_name: string | null; email: string | null } | null
    credit_packages: { name: string; credits: number } | null
}

interface Payout {
    id: string
    mentor_id: string
    amount_cents: number
    currency: string
    status: string
    period_start: string
    period_end: string
    paid_at: string | null
    created_at: string | null
    profiles: { full_name: string | null; email: string | null } | null
}

interface Props {
    purchases: Purchase[]
    payouts: Payout[]
}

export default function TransactionsTabs({ purchases, payouts }: Props) {
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound')

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatDateRange = (start: string, end: string) => {
        const startDate = new Date(start)
        const endDate = new Date(end)

        const startLabel = startDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        })
        const endLabel = endDate.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })

        return `${startLabel} – ${endLabel}`
    }

    // Inbound totals
    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount_paid_cents, 0)
    const totalCredits = purchases.reduce((sum, p) => sum + p.credits_purchased, 0)

    // Outbound totals
    const totalPayoutAmount = payouts.reduce((sum, p) => sum + (p.amount_cents || 0), 0)

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-3xl font-black text-green-600">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {activeTab === 'inbound' ? 'Credits Sold' : 'Total Payouts'}
                    </p>
                    <p className="text-3xl font-black text-accent">
                        {activeTab === 'inbound'
                            ? totalCredits
                            : formatPrice(totalPayoutAmount)}
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {activeTab === 'inbound' ? 'Total Purchases' : 'Total Payouts'}
                    </p>
                    <p className="text-3xl font-black text-gray-900">
                        {activeTab === 'inbound' ? purchases.length : payouts.length}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('inbound')}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'inbound'
                        ? 'text-green-600 border-green-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                >
                    <ArrowDownLeft className="w-4 h-4" />
                    Inbound (Purchases)
                </button>
                <button
                    onClick={() => setActiveTab('outbound')}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'outbound'
                        ? 'text-red-600 border-red-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                >
                    <ArrowUpRight className="w-4 h-4" />
                    Outbound (Payouts)
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'inbound' ? (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Student</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Package</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Credits</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchases.map((purchase) => (
                                <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {purchase.profiles?.full_name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {purchase.profiles?.email || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">
                                        {purchase.credit_packages?.name || 'Custom'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-accent/10 text-accent">
                                            +{purchase.credits_purchased}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-green-600">
                                        {formatPrice(purchase.amount_paid_cents, purchase.currency)}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {purchase.completed_at ? formatDateTime(purchase.completed_at) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No purchases yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Mentor</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Period</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600">Paid At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {payouts.map((payout) => (
                                <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {payout.profiles?.full_name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {payout.profiles?.email || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-700">
                                        {formatDateRange(payout.period_start, payout.period_end)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-red-600">
                                        {formatPrice(payout.amount_cents, payout.currency)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                payout.status === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : payout.status === 'processing'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : payout.status === 'failed'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-sm">
                                        {payout.paid_at
                                            ? formatDateTime(payout.paid_at)
                                            : payout.created_at
                                                ? formatDateTime(payout.created_at)
                                                : '-'}
                                    </td>
                                </tr>
                            ))}
                            {payouts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No payouts yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
