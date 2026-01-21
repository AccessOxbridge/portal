import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PaymentSuccessPage({
    searchParams
}: {
    searchParams: Promise<{ session_id?: string }>
}) {
    const params = await searchParams
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    // Fetch updated credits
    const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()

    // Fetch purchase details if session_id provided
    let purchase = null
    if (params.session_id) {
        const { data } = await supabase
            .from('credit_purchases')
            .select('*, credit_packages(*)')
            .eq('stripe_session_id', params.session_id)
            .single()
        purchase = data
    }

    return (
        <div className="max-w-2xl mx-auto text-center py-16">
            {/* Success Icon */}
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
                Payment Successful! 🎉
            </h1>

            <p className="text-xl text-gray-600 mb-8">
                Your credits have been added to your account.
            </p>

            {/* Credits Added */}
            {purchase && (
                <div className="bg-accent/5 border border-accent/20 rounded-3xl p-8 mb-8">
                    <div className="text-6xl font-black text-accent mb-2">
                        +{purchase.credits_purchased}
                    </div>
                    <p className="text-gray-600">credits added</p>
                </div>
            )}

            {/* New Balance */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-10">
                <p className="text-gray-500 text-sm mb-1">Your New Balance</p>
                <p className="text-3xl font-bold text-gray-900">
                    {profile?.credits || 0} Credits
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/dashboard/student"
                    className="px-8 py-4 bg-accent text-white font-bold rounded-2xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                >
                    Start Booking Sessions
                </Link>
                <Link
                    href="/dashboard/student/credits"
                    className="px-8 py-4 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                >
                    Buy More Credits
                </Link>
            </div>

            {/* Receipt Note */}
            <p className="mt-10 text-sm text-gray-400">
                A receipt has been sent to your email address.
            </p>
        </div>
    )
}
