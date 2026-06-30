'use client'

import { useState } from 'react'

interface StripeOnboardingButtonProps {
    variant: 'setup' | 'continue'
}

// Stripe Connect onboarding for mentors. Set to `true` to pause the button
// and its click handler (e.g. during maintenance).
const STRIPE_CONNECT_DISABLED = false

export function StripeOnboardingButton({ variant }: StripeOnboardingButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleClick = async () => {
        if (STRIPE_CONNECT_DISABLED) return
        setLoading(true)
        try {
            const res = await fetch('/api/stripe/connect/onboarding', {
                method: 'POST'
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to start onboarding')
            }

            const { url } = await res.json()
            window.location.href = url
        } catch (error: any) {
            console.error('Onboarding error:', error)
            alert(error.message || 'Failed to start Stripe onboarding')
            setLoading(false)
        }
    }

    const isDisabled = STRIPE_CONNECT_DISABLED || loading

    return (
        <button
            onClick={handleClick}
            disabled={isDisabled}
            title={STRIPE_CONNECT_DISABLED ? 'Stripe setup is temporarily unavailable' : undefined}
            className={`
                inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all
                disabled:cursor-not-allowed
                ${STRIPE_CONNECT_DISABLED
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : variant === 'setup'
                        ? 'bg-[#635BFF] text-white hover:bg-[#5851E0] shadow-lg shadow-[#635BFF]/25 disabled:opacity-50'
                        : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25 disabled:opacity-50'}
            `}
        >
            {loading ? (
                <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                </>
            ) : (
                <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.94 3.495 1.608 3.495 2.622 0 .906-.683 1.426-1.932 1.426-1.644 0-4.818-.89-6.996-2.077l-.89 5.555C5.391 22.772 8.094 24 11.915 24c2.585 0 4.724-.654 6.27-1.871 1.633-1.305 2.422-3.267 2.422-5.643 0-4.069-2.496-5.76-6.631-7.336z" />
                    </svg>
                    {variant === 'setup' ? 'Set Up Payments' : 'Complete Setup'}
                </>
            )}
        </button>
    )
}
