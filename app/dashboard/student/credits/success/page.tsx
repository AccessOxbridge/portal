import { redirect } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { CheckCircle as CheckCircle2, WarningCircle as AlertCircle, ArrowRight, SquaresFour as LayoutDashboard } from '@phosphor-icons/react/ssr'

export default async function SuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ session_id: string }>
}) {
    const params = await searchParams;
    const sessionId = params.session_id

    if (!sessionId) {
        redirect('/dashboard/student')
    }

    const supabase = await createClient()

    // 1. Fetch purchase details using the session_id
    const { data: purchase, error } = await supabase
        .from('credit_purchases')
        .select(`
            *,
            credit_packages (
                name,
                credits
            )
        `)
        .eq('stripe_session_id', sessionId)
        .single()

    if (error || !purchase) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <div className="mb-5 grid size-16 place-items-center rounded-full bg-tint-rose text-destructive">
                    <AlertCircle weight="duotone" className="size-8" />
                </div>
                <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">Purchase not found</h1>
                <p className="mb-8 max-w-md text-muted-foreground text-pretty">
                    We couldn't find the purchase details for this session. It might have already been processed or the ID is invalid.
                </p>
                <Link
                    href="/dashboard/student"
                    className={buttonVariants()}
                >
                    <LayoutDashboard />
                    Return to dashboard
                </Link>
            </div>
        )
    }

    const { status, credit_packages } = purchase
    const isPending = status === 'pending'
    const isCompleted = status === 'completed'

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
            <div className={`mb-6 grid size-20 place-items-center rounded-full ${isCompleted ? 'bg-success text-white ring-8 ring-tint-green animate-in zoom-in-50 fade-in-0 duration-500 ease-snappy motion-reduce:animate-none' : 'bg-tint-blue text-brand'
                }`}>
                {isCompleted ? (
                    <CheckCircle2 weight="fill" className="size-10" />
                ) : (
                    <Spinner className="size-9" />
                )}
            </div>

            <h1 className="mb-2 text-3xl font-semibold tracking-tight text-foreground text-balance">
                {isCompleted ? 'Payment successful' : 'Processing payment...'}
            </h1>

            <p className="mb-8 max-w-lg text-lg text-muted-foreground text-pretty">
                {isCompleted
                    ? `You've successfully purchased ${credit_packages?.credits} credits. They have been added to your account.`
                    : 'We have received your payment and are verifying the transaction. Your credits will be added shortly.'}
            </p>

            {isCompleted && (
                <div className="mb-8 w-full max-w-md rounded-card bg-card p-5 text-sm shadow-border">
                    <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                        <span className="text-muted-foreground">Package</span>
                        <span className="font-medium text-foreground tabular-nums">{credit_packages?.name}</span>
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
                        <span className="text-muted-foreground">Credits</span>
                        <span className="font-medium text-foreground tabular-nums">+{credit_packages?.credits}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Order ID</span>
                        <span className="font-mono text-sm text-muted-foreground">#{purchase.id.slice(0, 8)}</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                    href="/dashboard/student"
                    className={buttonVariants()}
                >
                    <LayoutDashboard />
                    Go to dashboard
                </Link>
                <Link
                    href="/dashboard/student/mentors"
                    className={buttonVariants({ variant: 'outline' })}
                >
                    Find a mentor
                    <ArrowRight />
                </Link>
            </div>
        </div>
    )
}
