'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Construction } from 'lucide-react'

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

interface Props {
    purchases: Purchase[]
}

export default function TransactionsTabs({ purchases }: Props) {
    const [activeTab, setActiveTab] = useState<'inbound' | 'outbound'>('inbound')

    const formatPrice = (cents: number, currency: string = 'gbp') => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(cents / 100)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Calculate totals
    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount_paid_cents, 0)
    const totalCredits = purchases.reduce((sum, p) => sum + p.credits_purchased, 0)

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-3xl font-black text-green-600">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Credits Sold</p>
                    <p className="text-3xl font-black text-accent">{totalCredits}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Purchases</p>
                    <p className="text-3xl font-black text-gray-900">{purchases.length}</p>
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
                                        {purchase.completed_at ? formatDate(purchase.completed_at) : '-'}
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
                <div className="bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
                    <Construction className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Coming Soon</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Outbound transactions (mentor payouts, refunds) will be displayed here once the payout system is implemented.
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium">
                        <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        TODO: Implement mentor payout tracking
                    </div>
                </div>
            )}
        </div>
    )
}
