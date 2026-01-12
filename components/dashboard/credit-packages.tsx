'use client'

import { useState } from 'react'
import { CreditPackage } from '@/utils/stripe'

interface CreditPackagesProps {
    packages: CreditPackage[]
    currentCredits: number
}

export default function CreditPackages({ packages, currentCredits }: CreditPackagesProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const formatPrice = (cents: number, currency: string = 'gbp') => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(cents / 100)
    }

    const handlePurchase = async (packageId: string) => {
        setLoading(packageId)
        setError(null)

        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create checkout session')
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url

        } catch (err: any) {
            setError(err.message)
            setLoading(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Current Balance */}
            <div className="p-8 bg-gradient-to-br from-accent to-accent/80 rounded-[32px] text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-white/70 text-sm font-medium mb-1">Your Credit Balance</p>
                        <p className="text-5xl font-black">{currentCredits}</p>
                        <p className="text-white/70 text-sm mt-1">
                            {currentCredits === 1 ? '1 hour' : `${currentCredits} hours`} of mentorship available
                        </p>
                    </div>
                    <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Credit Packages */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Buy More Credits</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`relative p-8 bg-white rounded-[32px] border-2 transition-all hover:shadow-xl hover:scale-[1.02] ${pkg.is_popular
                                    ? 'border-accent shadow-lg shadow-accent/10'
                                    : 'border-gray-100'
                                }`}
                        >
                            {pkg.is_popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-white text-xs font-bold rounded-full">
                                    MOST POPULAR
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-black text-accent">
                                        {formatPrice(pkg.price_cents, pkg.currency)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-8">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span><strong>{pkg.credits} credits</strong> ({pkg.credits} hours)</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>AI-matched mentors</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>1-on-1 video sessions</span>
                                </div>
                                {pkg.description && (
                                    <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">
                                        {pkg.description}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={() => handlePurchase(pkg.id)}
                                disabled={loading !== null}
                                className={`w-full py-4 rounded-2xl font-bold transition-all ${pkg.is_popular
                                        ? 'bg-accent text-white hover:bg-accent/90'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                    } ${loading === pkg.id ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {loading === pkg.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Redirecting...
                                    </span>
                                ) : (
                                    `Buy ${pkg.credits} Credits`
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Info Section */}
            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="flex gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 mb-1">How Credits Work</h4>
                        <p className="text-blue-700 text-sm">
                            1 credit = 1 hour of mentorship. When you submit a mentorship request, credits are reserved
                            for each time slot you select. Credits are non-refundable once a session is confirmed.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
