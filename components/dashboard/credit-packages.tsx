'use client'

import { useState } from 'react'
import { CreditPackage } from '@/utils/stripe'
import { GraduationCap, ArrowRight, CheckCircle as CheckCircle2, Star, Phone } from '@phosphor-icons/react/ssr'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/utils/lib'

interface CreditPackagesProps {
    packages: CreditPackage[]
    currentCredits: number
    targetUniversity?: string | null
    targetCourse?: string | null
}

export default function CreditPackages({ packages, currentCredits, targetUniversity, targetCourse }: CreditPackagesProps) {
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

    // Find packages for the specific slots
    // We'll map the available packages to the 3 boxes logic
    // If exact packages aren't found, we'll try to use the closest match or fallback to the first available
    const mentorshipPackage = packages.find(p => p.credits === 1) || packages[0]
    const programPackage = packages.find(p => p.credits === 10) || packages.find(p => p.credits > 5) || packages[1]

    const strategistText = targetUniversity && targetCourse
        ? `${targetUniversity} ${targetCourse}`
        : 'Admissions'

    return (
        <div className="space-y-8 pb-20">
            {/* Top Banner Section */}
            <div className="rounded-card bg-card p-6 text-foreground shadow-border sm:p-8">
                <div className="grid md:grid-cols-1 gap-4 items-center">
                    {/* Left: Balance */}
                    <div className="mb-4 flex items-center gap-5">
                        <div className="grid size-20 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                            <GraduationCap weight="duotone" className="size-10" />
                        </div>
                        <div>
                            <p className="text-5xl font-semibold tracking-tight tabular-nums">{currentCredits}</p>
                            <p className="text-lg text-muted-foreground">
                                {currentCredits === 1 ? 'Credit' : 'Credits'} available
                            </p>
                        </div>
                    </div>

                    {/* Right: CTA & Stats */}
                    <div className="space-y-5">
                        <div className="max-w-prose space-y-3">
                            <p className="text-lg leading-relaxed text-foreground text-pretty">
                                On average students who take bespoke mentorship with us are <span className="font-semibold text-brand">4x more likely</span> to gain a place at their number 1 choice university. We don't want you to miss out.
                            </p>
                            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                                We recommend making use of your free consultation first, as we want to ensure that you enroll on the programme that is the best fit for you. We don't believe in one-size-fits-all approaches. We believe in tailored pathway creation.
                            </p>
                        </div>

                        <button className={cn(buttonVariants({ size: 'lg' }), 'group w-full sm:w-auto')}>
                            <span>Speak to {strategistText} Strategist</span>
                            <ArrowRight weight="bold" className="transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div role="alert" className="rounded-card bg-tint-rose p-4 text-sm text-tint-rose-foreground">
                    {error}
                </div>
            )}

            {/* Service Boxes */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
                {/* Box 1: Strategy Call */}
                <div className="flex h-full flex-col rounded-card bg-card p-6 shadow-border transition-shadow duration-200 ease-out hover:shadow-border-hover sm:p-8">
                    <div className="flex-1 space-y-5">
                        <div className="grid size-12 place-items-center rounded-full bg-tint-green text-tint-green-foreground">
                            <Phone weight="duotone" className="size-6" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-semibold text-foreground">Strategy call</h3>
                            <p className="text-muted-foreground text-pretty">Initial consultation to map out your application journey.</p>
                        </div>
                        <div className="border-t border-border pt-4">
                            <span className="text-2xl font-semibold text-success">Complimentary</span>
                        </div>
                    </div>
                    <button className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 w-full')}>
                        Book now
                    </button>
                </div>

                {/* Box 2: 1-1 Mentorship (Most Popular) */}
                <div className="relative z-10 flex h-full flex-col rounded-card bg-card p-6 shadow-border transition-shadow duration-200 ease-out hover:shadow-border-hover sm:p-8 ring-2 ring-primary">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium whitespace-nowrap text-primary-foreground">
                        Most popular
                    </div>

                    <div className="flex-1 space-y-5">
                        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-tint-blue text-tint-blue-foreground">
                            <Star weight="fill" className="size-6" />
                        </div>

                        <div>
                            <h3 className="mb-1 text-xl font-semibold text-foreground">1-1 mentorship</h3>
                            <p className="text-muted-foreground text-pretty">Expert guidance from an admissions specialist.</p>
                        </div>

                        <div className="border-t border-border pt-4">
                            <div className="flex items-baseline gap-2.5 tabular-nums">
                                <span className="text-3xl font-semibold tracking-tight text-foreground">£44.99</span>
                                <span className="text-lg text-muted-foreground line-through">£79.99</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-brand">Member's discount applied</p>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5 text-sm text-foreground">
                                <CheckCircle2 weight="fill" className="size-5 shrink-0 text-success" />
                                <span>1 hour with an expert mentor</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-foreground">
                                <CheckCircle2 weight="fill" className="size-5 shrink-0 text-success" />
                                <span>Personalised feedback</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => mentorshipPackage && handlePurchase(mentorshipPackage.id)}
                        disabled={loading !== null || !mentorshipPackage}
                        className={cn(buttonVariants(), 'mt-6 w-full')}
                    >
                        {loading === mentorshipPackage?.id ? 'Processing...' : 'Get started'}
                    </button>
                </div>

                {/* Box 3: 10 Hour Programme */}
                <div className="flex h-full flex-col rounded-card bg-card p-6 shadow-border transition-shadow duration-200 ease-out hover:shadow-border-hover sm:p-8">
                    <div className="flex-1 space-y-5">
                        <div className="grid size-12 place-items-center rounded-full bg-tint-violet text-tint-violet-foreground">
                            <GraduationCap weight="duotone" className="size-6" />
                        </div>
                        <div>
                            <h3 className="mb-1 text-xl font-semibold text-foreground">Academic development</h3>
                            <p className="text-muted-foreground text-pretty">Comprehensive 10-hour mentorship programme.</p>
                        </div>

                        <div className="border-t border-border pt-4">
                            <span className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">£595.00</span>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center gap-2.5 text-sm text-foreground">
                                <CheckCircle2 weight="fill" className="size-5 shrink-0 text-success" />
                                <span>10 hours of 1-1 mentorship</span>
                            </div>
                            <div className="flex items-center gap-2.5 text-sm text-foreground">
                                <CheckCircle2 weight="fill" className="size-5 shrink-0 text-success" />
                                <span>Long-term strategy</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => programPackage && handlePurchase(programPackage.id)}
                        disabled={loading !== null || !programPackage}
                        className={cn(buttonVariants({ variant: 'secondary' }), 'mt-6 w-full')}
                    >
                        {loading === programPackage?.id ? 'Processing...' : 'Select programme'}
                    </button>
                </div>
            </div>
        </div>
    )
}
