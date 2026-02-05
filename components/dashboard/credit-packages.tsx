'use client'

import { useState, useEffect } from 'react'
import { CreditPackage } from '@/utils/stripe'
import { GraduationCap, ArrowRight, CheckCircle2, Star, Phone } from 'lucide-react'

interface CreditPackagesProps {
    packages: CreditPackage[]
    currentCredits: number
    targetUniversity?: string | null
    targetCourse?: string | null
}

export default function CreditPackages({ packages, currentCredits, targetUniversity, targetCourse }: CreditPackagesProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [lastHourCount, setLastHourCount] = useState(11)

    useEffect(() => {
        // Subtle random update to the "last hour" count to make it feel alive
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setLastHourCount(prev => prev + (Math.random() > 0.5 ? 1 : -1))
            }
        }, 10000)
        return () => clearInterval(interval)
    }, [])

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
        <div className="space-y-12 pb-20">
            {/* Top Banner Section */}
            <div className="p-8 bg-white text-black rounded-[32px]
             shadow-xl shadow-blue-900/10">
                <div className="grid md:grid-cols-1 gap-4 items-center">
                    {/* Left: Balance */}
                    <div className="flex items-center gap-6 mb-6">
                        <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center shrink-0 backdrop-blur-sm">
                            <GraduationCap className="w-12 h-12" />
                        </div>
                        <div>
                            <p className="text-6xl font-black tracking-tight">{currentCredits}</p>
                            <p className=" font-medium text-lg opacity-90">
                                {currentCredits === 1 ? 'Credit' : 'Credits'} Available
                            </p>
                        </div>
                    </div>

                    {/* Right: CTA & Stats */}
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <p className="text-lg leading-relaxed font-medium">
                                On average students who take bespoke mentorship with us are <span className="font-bold decoration-blue-300 underline underline-offset-4">4x more likely</span> to gain a place at their number 1 choice university. We don't want you to miss out.
                            </p>
                            <p className="text-sm leading-relaxed">
                                We recommend making use of your free consultation first, as we want to ensure that you enroll on the programme that is the best fit for you. We don't believe in one-size-fits-all approaches. We believe in tailored pathway creation.
                            </p>
                        </div>

                        <button className="group w-full bg-accent text-white hover:bg-blue-50 px-8 py-5 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3">
                            <span>Speak to {strategistText} Strategist</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Service Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Box 1: Strategy Call */}
                <div className="flex flex-col h-full p-8 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                    <div className="flex-1 space-y-6">
                        <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center">
                            <Phone className="w-7 h-7 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Strategy Call</h3>
                            <p className="text-gray-500">Initial consultation to map out your application journey.</p>
                        </div>
                        <div className="py-4 border-t border-gray-100">
                            <span className="text-2xl font-bold text-green-600">Complimentary</span>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-4 rounded-2xl border-2 border-gray-100 text-gray-900 font-bold hover:border-gray-200 hover:bg-gray-50 transition-all">
                        Book Now
                    </button>
                </div>

                {/* Box 2: 1-1 Mentorship (Most Popular) */}
                <div className="flex flex-col h-full relative p-8 bg-white rounded-[32px] border-2 border-accent shadow-xl shadow-accent/10 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 z-10">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-accent text-white text-xs font-bold rounded-full tracking-wide shadow-md uppercase">
                        Most Popular
                    </div>

                    <div className="flex-1 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center">
                                <Star className="w-7 h-7 text-accent fill-accent" />
                            </div>
                            <div className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-100 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                {lastHourCount} purchased in the last hour
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">1-1 Mentorship</h3>
                            <p className="text-gray-500">Expert guidance from an admissions specialist.</p>
                        </div>

                        <div className="py-4 border-t border-gray-100">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-black text-gray-900">£44.99</span>
                                <span className="text-lg text-gray-400 line-through decoration-2">£79.99</span>
                            </div>
                            <p className="text-xs font-bold text-accent mt-1">Member's Discount Applied</p>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                <span>1 Hour with Expert Mentor</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                <span>Personalized Feedback</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => mentorshipPackage && handlePurchase(mentorshipPackage.id)}
                        disabled={loading !== null || !mentorshipPackage}
                        className="mt-8 w-full py-4 rounded-2xl bg-accent text-white font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                    >
                        {loading === mentorshipPackage?.id ? 'Processing...' : 'Get Started'}
                    </button>
                </div>

                {/* Box 3: 10 Hour Programme */}
                <div className="flex flex-col h-full p-8 bg-white rounded-[32px] border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                    <div className="flex-1 space-y-6">
                        <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center">
                            <GraduationCap className="w-7 h-7 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Academic Development</h3>
                            <p className="text-gray-500">Comprehensive 10-hour mentorship programme.</p>
                        </div>

                        <div className="py-4 border-t border-gray-100">
                            <span className="text-3xl font-black text-gray-900">£595.00</span>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                <span>10 Hours of 1-1 Mentorship</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                <span>Long-term Strategy</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => programPackage && handlePurchase(programPackage.id)}
                        disabled={loading !== null || !programPackage}
                        className="mt-8 w-full py-4 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-all"
                    >
                        {loading === programPackage?.id ? 'Processing...' : 'Select Programme'}
                    </button>
                </div>
            </div>
        </div>
    )
}
