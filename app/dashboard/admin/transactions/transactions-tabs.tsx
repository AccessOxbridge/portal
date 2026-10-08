'use client'

import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from '@phosphor-icons/react/ssr'
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
                <div className="bg-card rounded-card border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total revenue</p>
                    <p className="text-3xl font-semibold text-success">{formatPrice(totalRevenue)}</p>
                </div>
                <div className="bg-card rounded-card border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        {activeTab === 'inbound' ? 'Credits sold' : 'Total payouts'}
                    </p>
                    <p className="text-3xl font-semibold text-primary">
                        {activeTab === 'inbound'
                            ? totalCredits
                            : formatPrice(totalPayoutAmount)}
                    </p>
                </div>
                <div className="bg-card rounded-card border border-border p-6">
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                        {activeTab === 'inbound' ? 'Total purchases' : 'Total payouts'}
                    </p>
                    <p className="text-3xl font-semibold text-foreground">
                        {activeTab === 'inbound' ? purchases.length : payouts.length}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
                <button
                    onClick={() => setActiveTab('inbound')}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'inbound'
                        ? 'text-success border-success'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                        }`}
                >
                    <ArrowDownLeft className="size-4" />
                    Inbound (Purchases)
                </button>
                <button
                    onClick={() => setActiveTab('outbound')}
                    className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'outbound'
                        ? 'text-destructive border-destructive'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                        }`}
                >
                    <ArrowUpRight className="size-4" />
                    Outbound (Payouts)
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'inbound' ? (
                <div className="bg-card rounded-card border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/60 border-b border-border">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Student</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Package</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Credits</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {purchases.map((purchase) => (
                                <tr key={purchase.id} className="hover:bg-muted/60 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {purchase.profiles?.full_name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {purchase.profiles?.email || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        {purchase.credit_packages?.name || 'Custom'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary">
                                            +{purchase.credits_purchased}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-success">
                                        {formatPrice(purchase.amount_paid_cents, purchase.currency)}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm">
                                        {purchase.completed_at ? formatDateTime(purchase.completed_at) : '-'}
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        No purchases yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-card rounded-card border border-border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted/60 border-b border-border">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Mentor</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Period</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Status</th>
                                <th className="text-left px-6 py-4 text-sm font-semibold text-muted-foreground">Paid at</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {payouts.map((payout) => (
                                <tr key={payout.id} className="hover:bg-muted/60 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {payout.profiles?.full_name || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {payout.profiles?.email || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-foreground">
                                        {formatDateRange(payout.period_start, payout.period_end)}
                                    </td>
                                    <td className="px-6 py-4 font-semibold text-destructive">
                                        {formatPrice(payout.amount_cents, payout.currency)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                payout.status === 'paid'
                                                    ? 'bg-tint-green text-tint-green-foreground'
                                                    : payout.status === 'processing'
                                                    ? 'bg-tint-blue text-tint-blue-foreground'
                                                    : payout.status === 'failed'
                                                    ? 'bg-tint-rose text-tint-rose-foreground'
                                                    : 'bg-muted text-foreground'
                                            }`}
                                        >
                                            {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm">
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
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
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
