import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
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
        .from('profiles_private')
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
        <div className="mx-auto max-w-xl py-12 text-center sm:py-16">
            {/* Success Icon */}
            <div className="mx-auto mb-6 grid size-20 place-items-center rounded-full bg-success text-white ring-8 ring-tint-green animate-in zoom-in-50 fade-in-0 duration-500 ease-snappy motion-reduce:animate-none">
                <svg className="size-10" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <h1 className="mb-3 text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
                Payment successful 🎉
            </h1>

            <p className="mb-8 text-lg text-muted-foreground text-pretty">
                Your credits have been added to your account.
            </p>

            {/* Credits Added */}
            {purchase && (
                <div className="mb-4 rounded-card bg-tint-blue p-8">
                    <div className="mb-1 text-6xl font-semibold tracking-tight text-brand tabular-nums">
                        +{purchase.credits_purchased}
                    </div>
                    <p className="text-tint-blue-foreground">credits added</p>
                </div>
            )}

            {/* New Balance */}
            <div className="mb-8 rounded-card bg-card p-6 shadow-border">
                <p className="mb-1 text-sm text-muted-foreground">Your new balance</p>
                <p className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {profile?.credits || 0} credits
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col justify-center gap-2 sm:flex-row">
                <Link
                    href="/dashboard/student"
                    className={buttonVariants({ size: 'lg' })}
                >
                    Start booking sessions
                </Link>
                <Link
                    href="/dashboard/student/credits"
                    className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                    Buy more credits
                </Link>
            </div>

            {/* Receipt Note */}
            <p className="mt-8 text-sm text-muted-foreground">
                A receipt has been sent to your email address.
            </p>
        </div>
    )
}
